local status_ok, wk = pcall(require, "which-key")
if not status_ok then
  return
end
-- local bufNo = vim.fn.bufnr('%') -- this function is not available now.


-------------------- Python Buffer Key Bindings ------------------------------
--
---- Get current buffer number
local bufNo = vim.api.nvim_get_current_buf()

-- Create the autocommand
vim.api.nvim_create_autocmd({ "FileType" }, {
  callback = function(ev)
    if vim.bo.filetype == 'python' then
      vim.cmd("lua WhichKeyPython(" .. ev.buf .. ")")
    end
  end
})

function WhichKeyPython(bufNumber)
  wk.register({
    ["<leader>j"] = {
      name = "Jupyter",
      i = { "<Cmd>MagmaInit<CR>", "Init Magma" },
      d = { "<Cmd>MagmaDeinit<CR>", "Deinit Magma" },
      e = { "<Cmd>MagmaEvaluateLine<CR>", "Evaluate Line" },
      r = { "<Cmd>MagmaReevaluateCell<CR>", "Re evaluate cell" },
      D = { "<Cmd>MagmaDelete<CR>", "Delete cell" },
      s = { "<Cmd>MagmaShowOutput<CR>", "Show Output" },
      R = { "<Cmd>MagmaRestart!<CR>", "Restart Magma" },
      S = { "<Cmd>MagmaSave<CR>", "Save" },
    },
    ["<leader>d"] = {
      name = "Debug",
      s = { "<cmd>lua require('dap-python').debug_selection()<cr>", "Debug Selection" },
      f = { "<cmd>lua require('dap-python').test_class()<cr>", "Test Class" },
      m = { "<cmd>lua require('dap-python').test_method()<cr>", "Test Method" }
    },
  }, { buffer = bufNumber })
end

-------------------- Tex Buffer Key Bindings ------------------------------

vim.cmd('autocmd FileType tex lua WhichKeyTex(' .. bufNo .. ')')
function WhichKeyTex(bufNumber)
  wk.register({
    -- ["<leader>j"] = {
    --   name = "Jupyter",
    --   i = { "<Cmd>MagmaInit<CR>", "Init Magma" },
    --   d = { "<Cmd>MagmaDeinit<CR>", "Deinit Magma" },
    --   e = { "<Cmd>MagmaEvaluateLine<CR>", "Evaluate Line" },
    --   r = { "<Cmd>MagmaReevaluateCell<CR>", "Re evaluate cell" },
    --   D = { "<Cmd>MagmaDelete<CR>", "Delete cell" },
    --   s = { "<Cmd>MagmaShowOutput<CR>", "Show Output" },
    --   R = { "<Cmd>MagmaRestart!<CR>", "Restart Magma" },
    --   S = { "<Cmd>MagmaSave<CR>", "Save" },
    -- },
    -- ["<leader>d"] = {
    --   name = "Debug",
    --   s = { "<cmd>lua require('dap-python').debug_selection()<cr>", "Debug Selection" },
    --   f = { "<cmd>lua require('dap-python').test_class()<cr>", "Test Class" },
    --   m = { "<cmd>lua require('dap-python').test_method()<cr>", "Test Method" }
    -- },
  }, { buffer = bufNumber })
end