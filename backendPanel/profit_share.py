import logging
from time import time, sleep
from datetime import datetime, timedelta
from django.db import connection, close_old_connections

logger = logging.getLogger(__name__)

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
                    t.id
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

        if percentage <= 0:
            logger.info(f"[PROFIT-SHARE] Skipping {follower_id}: percentage {percentage} <= 0")
            return

        commission = round(profit * (percentage / 100), 2)
        if commission <= 0:
            logger.info(f"[PROFIT-SHARE] Skipping {follower_id}: calculated commission {commission} <= 0")
            return

        logger.info(f"[PROFIT-SHARE] Deducting commission {commission} from {follower_id} (profit {profit}, share {percentage}%)")
        
        # Deduct from follower (type 2 is DEAL_BALANCE)
        success_investor = manager.DealerBalance(follower_id, -commission, 2, f"MAM Profit Share ({percentage}%)")

        if success_investor:
            logger.info(f"[PROFIT-SHARE] Successfully deducted from {follower_id}. Crediting {master_login}...")
            # Add to master
            success_master = manager.DealerBalance(master_login, commission, 2, f"Profit Share from Inv {follower_id}")
            if success_master:
                logger.info(f"[PROFIT-SHARE] Successfully credited master {master_login} with {commission}.")
            else:
                logger.error(f"[PROFIT-SHARE] Failed to credit master {master_login} with {commission}.")

            # Save history using raw SQL
            with connection.cursor() as cursor:
                cursor.execute(
                    'INSERT INTO "profit_share_history" (master_login, investor_login, master_position, investor_position, profit, commission_percentage, commission_amount, manager_account, investor_account, created_at, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s)',
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
                        'Completed'
                    ]
                )
                logger.info(f"[PROFIT-SHARE] Saved history to database for {follower_id}")
        else:
            logger.error(f"[PROFIT-SHARE] Failed to deduct from {follower_id}.")

    except Exception as e:
        logger.error(f"Error processing profit share for follower {follower_id}: {e}")
