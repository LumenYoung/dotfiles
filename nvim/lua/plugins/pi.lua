-- Keep AstroNvim's <Leader>p plugin-management mappings intact.
return {
  "carderne/pi-nvim",
  cmd = { "Pi", "PiSend", "PiSendFile", "PiSendSelection", "PiSendBuffer", "PiPing", "PiSessions" },
  opts = { set_default_keymaps = false },
  -- With multiple Pi processes in the same cwd, select a target with PiSessions
  -- before sending. The selection lasts for this Neovim process, not across restarts.
  keys = {
    { "<Leader>ap", ":Pi<CR>", mode = { "n", "x" }, desc = "Pi: send context and prompt" },
    { "<Leader>as", "<Cmd>PiSessions<CR>", desc = "Pi: select running session" },
    { "<Leader>af", "<Cmd>PiSendFile<CR>", desc = "Pi: send current file" },
    { "<Leader>ab", "<Cmd>PiSendBuffer<CR>", desc = "Pi: send entire buffer" },
    { "<Leader>ai", "<Cmd>PiPing<CR>", desc = "Pi: ping selected session" },
  },
}
