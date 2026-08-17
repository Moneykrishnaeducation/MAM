import re

with open("Frontend/apps/web/src/pages/admin/mails/index.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add new icons from lucide-react
if "Menu," not in content:
    content = content.replace("from \"lucide-react\";", "Menu,\n  Edit2,\n  from \"lucide-react\";")
    # Fix potential syntax issue if I just replaced it naively
    content = content.replace("Edit2,\n  from", "Edit2,\n} from")

# 2. Main wrapper background
content = content.replace(
    'className="w-full h-[calc(100vh-80px)] flex flex-col bg-transparent text-white overflow-hidden p-3 sm:p-6 relative"',
    'className="w-full h-[calc(100vh-60px)] md:h-[calc(100vh-80px)] flex flex-col bg-[#121212] md:bg-transparent text-white overflow-hidden md:p-6 relative"'
)

# 3. Top Gmail Header & Action Bar -> Hide on mobile
content = content.replace(
    '<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 bg-[#081942]/90 p-4 rounded-3xl border border-[#1D3B8A] shadow-xl backdrop-blur-xl flex-shrink-0">',
    '{/* Mobile Search Header (Gmail Dark) */}\n        <div className="md:hidden px-4 pt-3 pb-1 bg-[#121212] flex-shrink-0">\n          <div className="flex items-center bg-[#2d2c30] rounded-full px-4 py-3 shadow-md">\n            <Menu className="w-6 h-6 text-gray-300 mr-4" />\n            <input\n              type="text"\n              value={searchQuery}\n              onChange={(e) => setSearchQuery(e.target.value)}\n              placeholder="Search in mail"\n              className="flex-1 bg-transparent border-none text-[15px] text-gray-200 outline-none placeholder:text-gray-400"\n            />\n            <Sparkles className="w-5 h-5 text-gray-300 ml-2" />\n            <div className="w-8 h-8 bg-[#ff5722] rounded-full flex items-center justify-center text-white font-bold text-sm ml-4">\n              N\n            </div>\n          </div>\n          <h2 className="text-gray-200 text-xs font-semibold tracking-wide mt-5 mb-1 px-1">Inbox</h2>\n        </div>\n\n        <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 bg-[#081942]/90 p-4 rounded-3xl border border-[#1D3B8A] shadow-xl backdrop-blur-xl flex-shrink-0">'
)

# 4. Hide Category pill bar on mobile
content = content.replace(
    '<div className="flex lg:hidden overflow-x-auto gap-2 p-3 border-b border-[#1D3B8A] scrollbar-none">',
    '<div className="hidden md:flex lg:hidden overflow-x-auto gap-2 p-3 border-b border-[#1D3B8A] scrollbar-none">'
)

# 5. Mail List container styling
content = content.replace(
    '<div className="flex-1 flex flex-col bg-[#081942]/90 rounded-3xl border border-[#1D3B8A] backdrop-blur-xl overflow-hidden shadow-2xl">',
    '<div className="flex-1 flex flex-col bg-[#121212] md:bg-[#081942]/90 md:rounded-3xl md:border border-[#1D3B8A] backdrop-blur-xl overflow-hidden md:shadow-2xl">'
)
content = content.replace(
    '<div className="flex-1 overflow-y-auto divide-y divide-[#1D3B8A]/50">',
    '<div className="flex-1 overflow-y-auto divide-y divide-[#2d2c30] md:divide-[#1D3B8A]/50">'
)

# 6. Mail Item Replacement
old_mail_item = '''<div
                        key={mail.id}
                        onClick={() => setSelectedEmail(mail)}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-[#0d286d]/40 transition-all cursor-pointer gap-3"
                      >
                        {/* Left: Recipient & Event Type */}
                        <div className="flex items-center gap-3 sm:w-1/4 min-w-0">
                          <div className="w-9 h-9 rounded-2xl bg-[#051336] border border-[#1D3B8A] flex items-center justify-center text-xs font-black text-[#E0B01D] group-hover:border-[#E0B01D] transition-all flex-shrink-0">
                            {(mail.to && mail.to[0]) ? mail.to[0].charAt(0).toUpperCase() : 'M'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">
                              {(mail.to && mail.to.join(', ')) || 'No recipients'}
                            </p>
                            <span className="inline-block text-[9px] font-black uppercase tracking-wider text-[#8FB8FF]/80">
                              {mail.source || 'Admin'}
                            </span>
                          </div>
                        </div>

                        {/* Middle: Subject & Context snippet */}
                        <div className="flex-1 min-w-0 px-0 sm:px-4">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-white truncate group-hover:text-[#E0B01D] transition-colors">
                              {mail.subject || '(No Subject)'}
                            </p>
                          </div>
                          <p className="text-[11px] font-medium text-[#8FB8FF]/60 truncate mt-0.5">
                            {mail.body?.substring(0, 80) || ''}
                          </p>
                        </div>

                        {/* Right: Status & Date */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0">
                          <div>
                            {getStatusBadge(mail.status)}
                          </div>
                          <span className="text-[11px] font-semibold text-[#8FB8FF]/70 whitespace-nowrap">
                            {formatDate(mail.created_at)}
                          </span>
                        </div>
                      </div>'''

new_mail_item = '''<div
                        key={mail.id}
                        onClick={() => setSelectedEmail(mail)}
                        className="group flex flex-row items-start justify-between p-4 md:p-4 md:hover:bg-[#0d286d]/40 transition-all cursor-pointer gap-3"
                      >
                        {/* Left Avatar */}
                        <div className="flex-shrink-0">
                          <div className="w-11 h-11 md:w-9 md:h-9 rounded-full md:rounded-2xl bg-[#ff6b6b] md:bg-[#051336] md:border border-[#1D3B8A] flex items-center justify-center text-lg md:text-xs font-normal md:font-black text-black md:text-[#E0B01D] transition-all">
                            {(mail.to && mail.to[0]) ? mail.to[0].charAt(0).toUpperCase() : 'M'}
                          </div>
                        </div>

                        {/* Mobile Text Block */}
                        <div className="md:hidden flex-1 min-w-0 ml-1">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <p className="text-[15px] font-bold text-gray-100 truncate pr-2">
                              {(mail.to && mail.to[0]) || 'No recipient'}
                            </p>
                            <span className="text-[11px] text-gray-400 shrink-0">
                              {formatDate(mail.created_at)}
                            </span>
                          </div>
                          <p className="text-[14px] font-bold text-gray-200 truncate mb-0.5">
                            {mail.subject || '(No Subject)'}
                          </p>
                          <div className="flex justify-between items-start">
                            <p className="text-[13px] text-gray-400 truncate pr-2">
                              {mail.body?.substring(0, 80) || ''}
                            </p>
                            <Star className="w-5 h-5 text-gray-500 shrink-0" />
                          </div>
                        </div>

                        {/* Desktop Text Block (Original Layout but wrapped) */}
                        <div className="hidden md:flex flex-1 min-w-0 items-center justify-between">
                          <div className="flex items-center gap-3 w-1/4 min-w-0">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {(mail.to && mail.to.join(', ')) || 'No recipients'}
                              </p>
                              <span className="inline-block text-[9px] font-black uppercase tracking-wider text-[#8FB8FF]/80">
                                {mail.source || 'Admin'}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 px-4">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-white truncate group-hover:text-[#E0B01D] transition-colors">
                                {mail.subject || '(No Subject)'}
                              </p>
                            </div>
                            <p className="text-[11px] font-medium text-[#8FB8FF]/60 truncate mt-0.5">
                              {mail.body?.substring(0, 80) || ''}
                            </p>
                          </div>
                          <div className="flex items-center justify-end gap-4 flex-shrink-0">
                            <div>{getStatusBadge(mail.status)}</div>
                            <span className="text-[11px] font-semibold text-[#8FB8FF]/70 whitespace-nowrap">
                              {formatDate(mail.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>'''

if old_mail_item in content:
    content = content.replace(old_mail_item, new_mail_item)
else:
    print("Warning: Mail item template not found exactly.")

# 7. Add Floating Mobile Compose Button
compose_button = '''
      {/* Mobile Floating Compose Button */}
      <button 
        className="md:hidden fixed bottom-20 right-5 pl-4 pr-5 py-3.5 bg-[#c2e7ff] text-[#001d35] rounded-2xl flex items-center gap-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.5)] z-40 hover:bg-[#a6d5fa] transition-colors"
        onClick={() => { setIsComposeOpen(true); setIsComposeMinimized(false); setIsComposeMaximized(true); }}
      >
        <Edit2 className="w-5 h-5" />
        <span className="font-semibold text-[15px]">Compose</span>
      </button>

      {/* Toast Notification */}
'''
content = content.replace('{/* Toast Notification */}', compose_button)


with open("Frontend/apps/web/src/pages/admin/mails/index.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Done modifying index.tsx!")
