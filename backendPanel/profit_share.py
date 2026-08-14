import logging
from time import time, sleep
from datetime import datetime, timedelta, time as dt_time
from django.db import connection, close_old_connections
from django.utils import timezone

logger = logging.getLogger(__name__)


def _normalize_frequency(value):
    frequency = str(value or "").strip().lower()
    if frequency in {"", "immediate", "instant", "per-trade", "trade"}:
        return "immediate"
    if frequency in {"daily", "day", "1d"}:
        return "daily"
    if frequency in {"weekly", "week", "7d"}:
        return "weekly"
    if frequency in {"biweekly", "fortnight", "14d"}:
        return "biweekly"
    if frequency in {"monthly", "month", "30d"}:
        return "monthly"
    if frequency in {"quarterly", "3m", "90d"}:
        return "quarterly"
    return "immediate"


def _frequency_delta(value):
    frequency = _normalize_frequency(value)
    if frequency == "daily":
        return timedelta(days=1)
    if frequency == "weekly":
        return timedelta(days=7)
    if frequency == "biweekly":
        return timedelta(days=14)
    if frequency == "monthly":
        return timedelta(days=30)
    if frequency == "quarterly":
        return timedelta(days=90)
    return timedelta(0)


def _settlement_window(now, frequency):
    current = timezone.localtime(now)
    days_since_sunday = (current.weekday() + 1) % 7
    this_sunday = datetime.combine(
        (current - timedelta(days=days_since_sunday)).date(),
        dt_time.min,
        tzinfo=current.tzinfo,
    )
    if frequency == "biweekly":
        return this_sunday - timedelta(days=14), this_sunday
    return this_sunday - timedelta(days=7), this_sunday


def _monthly_settlement_window(now):
    current = timezone.localtime(now)
    current_month_start = current.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    previous_month_end = current_month_start
    previous_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
    next_month_start = (
        current_month_start.replace(year=current_month_start.year + 1, month=1)
        if current_month_start.month == 12
        else current_month_start.replace(month=current_month_start.month + 1)
    )
    next_month_start = next_month_start.replace(hour=0, minute=0, second=0, microsecond=0)
    return previous_month_start, previous_month_end, next_month_start


def _is_settlement_time(now):
    current = timezone.localtime(now)
    return current.weekday() == 6 and current.time() >= dt_time(1, 0)


def _is_monthly_settlement_time(now):
    current = timezone.localtime(now)
    first_day = current.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return current.date() == first_day.date() and current.time() >= dt_time(1, 0)

def handle_profit_share_async(manager, master_login, follower_id, pos_ticket):
    logger.info(f"[PROFIT-SHARE] Starting async profit share for follower {follower_id} on master {master_login} (pos {pos_ticket})")
    deal = wait_for_deal_confirmation(manager, follower_id, pos_ticket)
    if deal:
        logger.info(f"[PROFIT-SHARE] Deal confirmed for {follower_id} (deal {getattr(deal, 'Deal', 0)}, profit {getattr(deal, 'Profit', 0)})")
        process_profit_share(manager, master_login, follower_id, deal)
    else:
        logger.warning(f"[PROFIT-SHARE] Deal NOT found or timed out for {follower_id} (pos {pos_ticket})")

def wait_for_deal_confirmation(manager, follower_id, position_id, max_wait_sec=10):
    start_t = time()
    from_dt = datetime.now() - timedelta(days=1)
    to_dt = datetime.now() + timedelta(days=1)
    while time() - start_t < max_wait_sec:
        try:
            deals = manager.DealRequest(follower_id, from_dt, to_dt)
            if deals:
                for d in deals:
                    d_pos = getattr(d, 'PositionID', getattr(d, 'Position', 0))
                    d_entry = getattr(d, 'Entry', 0)
                    if d_pos == position_id and d_entry == 1:
                        return d
        except Exception as e:
            logger.debug(f"[PROFIT-SHARE] Error fetching deals: {e}")
        sleep(0.5)
    return None

def process_profit_share(manager, master_login, follower_id, closed_deal):
    try:
        profit = getattr(closed_deal, 'Profit', 0)
        if profit <= 0:
            logger.info(f"[PROFIT-SHARE] Skipping {follower_id}: profit {profit} <= 0")
            return

        try:
            close_old_connections()
        except Exception:
            pass

        # Extract master_position from comment
        master_pos = None
        deal_comment = str(getattr(closed_deal, 'Comment', ''))
        if deal_comment and '_' in deal_comment:
            parts = deal_comment.split('_')
            if len(parts) >= 2 and parts[1].isdigit():
                master_pos = parts[1]

        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT 
                    COALESCE(
                        p.profit_share_percentage, 
                        t.profit_sharing_percentage,
                        pm.profit_share_percentage,
                        tm.profit_sharing_percentage
                    ),
                    tm.id,
                    t.id,
                    COALESCE(tm.payout_frequency, t.payout_frequency),
                    COALESCE(tm.last_profit_share_at, tm.created_at)
                FROM "trading_accounts" t
                LEFT JOIN "mam_plans" p ON t.mam_plan_id = p.id
                LEFT JOIN "trading_accounts" tm ON t.mam_master_account_id = tm.id
                LEFT JOIN "mam_plans" pm ON tm.mam_plan_id = pm.id
                WHERE t.account_id = %s
                ''',
                [str(follower_id)]
            )
            row = cursor.fetchone()
            if not row:
                logger.warning(f"[PROFIT-SHARE] Account {follower_id} not found in DB")
                return
            if row[0] is None:
                logger.warning(f"[PROFIT-SHARE] Account {follower_id} has NULL profit_sharing_percentage")
                return
            percentage = float(row[0])
            manager_account_id = str(row[1]) if row[1] else None
            investor_account_id = str(row[2]) if row[2] else None
            payout_frequency = row[3]
            last_profit_share_at = row[4]

        if percentage <= 0:
            logger.info(f"[PROFIT-SHARE] Skipping {follower_id}: percentage {percentage} <= 0")
            return

        commission = round(profit * (percentage / 100), 2)
        if commission <= 0:
            logger.info(f"[PROFIT-SHARE] Skipping {follower_id}: calculated commission {commission} <= 0")
            return

        payout_frequency = _normalize_frequency(payout_frequency)
        now = timezone.now()
        is_immediate_payout = payout_frequency == "immediate"

        with connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO "profit_share_history"
                    (master_login, investor_login, master_position, investor_position, profit,
                     commission_percentage, commission_amount, manager_account, investor_account, created_at, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)
                ''',
                [
                    str(master_login),
                    str(follower_id),
                    str(master_pos) if master_pos else None,
                    str(getattr(closed_deal, 'PositionID', 0)),
                    profit,
                    percentage,
                    commission,
                    manager_account_id,
                    investor_account_id,
                    'Completed' if is_immediate_payout else 'Pending',
                ],
            )
            logger.info(
                f"[PROFIT-SHARE] Saved {'completed' if is_immediate_payout else 'pending'} history row for {follower_id}"
            )

        success_investor = manager.DealerBalance(
            follower_id, -commission, 2, f"MAM Profit Share ({percentage}%)"
        )
        if not success_investor:
            logger.error(f"[PROFIT-SHARE] Failed to deduct from {follower_id}.")
            return

        if is_immediate_payout:
            success_master = manager.DealerBalance(
                master_login, commission, 2, f"Profit Share from Inv {follower_id}"
            )
            if success_master:
                logger.info(
                    f"[PROFIT-SHARE] Immediately credited master {master_login} with {commission}."
                )
            else:
                logger.error(
                    f"[PROFIT-SHARE] Failed to immediately credit master {master_login} with {commission}."
                )
            return

        if payout_frequency not in {"weekly", "biweekly", "monthly"}:
            logger.info(
                f"[PROFIT-SHARE] Payout frequency '{payout_frequency}' is not weekly/biweekly/monthly; leaving commission pending for now."
            )
            return

        if payout_frequency == "monthly":
            if not _is_monthly_settlement_time(now):
                logger.info(
                    f"[PROFIT-SHARE] Monthly payout not due yet for {follower_id}; settlement runs on the first day of the next month."
                )
                return
            window_start, window_end, _first_saturday = _monthly_settlement_window(now)
            logger.info(
                f"[PROFIT-SHARE] Monthly settlement window for {follower_id}: {window_start.isoformat()} to {window_end.isoformat()}"
            )
        else:
            if not _is_settlement_time(now):
                logger.info(
                    f"[PROFIT-SHARE] Weekly/biweekly payout not due yet for {follower_id}; settlement runs on Sunday."
                )
                return

            if payout_frequency == "biweekly" and last_profit_share_at:
                if now < (last_profit_share_at + timedelta(days=14)):
                    logger.info(
                        f"[PROFIT-SHARE] Biweekly payout not due yet for {follower_id}; waiting for 14-day cycle."
                    )
                    return

            window_start, window_end = _settlement_window(now, payout_frequency)
            logger.info(
                f"[PROFIT-SHARE] {payout_frequency.capitalize()} settlement window for {follower_id}: {window_start.isoformat()} to {window_end.isoformat()}"
            )

        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT id, commission_amount
                FROM "profit_share_history"
                WHERE master_login = %s
                  AND investor_login = %s
                  AND status = 'Pending'
                  AND created_at >= %s
                  AND created_at < %s
                ORDER BY created_at ASC
                ''',
                [str(master_login), str(follower_id), window_start, window_end],
            )
            pending_rows = cursor.fetchall() or []

        total_commission = round(sum(float(r[1] or 0) for r in pending_rows), 2)
        if total_commission <= 0:
            logger.info(f"[PROFIT-SHARE] No pending commission to settle for {follower_id}")
            return

        logger.info(
            f"[PROFIT-SHARE] Settling {payout_frequency} commission {total_commission} for {follower_id} across {len(pending_rows)} pending row(s)"
        )

        success_master = manager.DealerBalance(
            master_login, total_commission, 2, f"Profit Share from Inv {follower_id}"
        )
        if success_master:
            logger.info(f"[PROFIT-SHARE] Successfully credited master {master_login} with {total_commission}.")
        else:
            logger.error(f"[PROFIT-SHARE] Failed to credit master {master_login} with {total_commission}.")
            return

        pending_ids = [str(r[0]) for r in pending_rows]
        with connection.cursor() as cursor:
            if pending_ids:
                placeholders = ", ".join(["%s"] * len(pending_ids))
                cursor.execute(
                    f'''
                    UPDATE "profit_share_history"
                    SET status = 'Completed'
                    WHERE id IN ({placeholders})
                    ''',
                    pending_ids,
                )
            cursor.execute(
                '''
                UPDATE "trading_accounts"
                SET last_profit_share_at = NOW()
                WHERE account_id = %s
                ''',
                [str(master_login)],
            )

    except Exception as e:
        logger.error(f"Error processing profit share for follower {follower_id}: {e}")
