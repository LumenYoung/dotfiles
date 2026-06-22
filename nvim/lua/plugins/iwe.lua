local function in_iwe_workspace(bufnr)
  return vim.fs.root(bufnr, { ".iwe" }) ~= nil
end

local function iwe_buf_map(bufnr, mode, lhs, rhs, desc, opts)
  opts = vim.tbl_extend("force", {
    buffer = bufnr,
    silent = true,
    desc = desc,
  }, opts or {})
  vim.keymap.set(mode, lhs, rhs, opts)
end

local function iwe_cmd(subcmd)
  return function() vim.cmd("IWE " .. subcmd) end
end

local function setup_iwe_buffer(bufnr)
  if not in_iwe_workspace(bufnr) then return end

  -- IWE's useful default Markdown-note bindings, but scoped to `.iwe` workspaces only.
  iwe_buf_map(bufnr, "n", "-", ":.g!/- \\[/.s/^/- /<CR>:noh<CR>``", "IWE checklist item")
  iwe_buf_map(bufnr, "n", "<C-n>", "/\\[.*\\](.*)<CR>:noh<CR>", "IWE next link")
  iwe_buf_map(bufnr, "n", "<C-p>", "?\\[.*\\](.*)<CR>:noh<CR>", "IWE previous link")
  iwe_buf_map(bufnr, "n", "<CR>", function() vim.lsp.buf.definition() end, "IWE go to definition")
  iwe_buf_map(bufnr, "v", "<CR>", function()
    vim.lsp.buf.code_action { apply = true, context = { only = { "custom.link" } } }
  end, "IWE create link")
  iwe_buf_map(bufnr, "i", "/d", function() return vim.fn.strftime "%b %d, %Y" end, "IWE insert date", { expr = true })
  iwe_buf_map(bufnr, "i", "/w", function() return vim.fn.strftime "Week %V, %Y" end, "IWE insert week", { expr = true })

  -- Namespaced IWE navigation/refactor commands for discoverability and fewer collisions.
  iwe_buf_map(bufnr, "n", "<Leader>nf", iwe_cmd "find_files", "IWE find files")
  iwe_buf_map(bufnr, "n", "<Leader>ns", iwe_cmd "paths", "IWE workspace symbols")
  iwe_buf_map(bufnr, "n", "<Leader>nr", iwe_cmd "roots", "IWE roots")
  iwe_buf_map(bufnr, "n", "<Leader>ng", iwe_cmd "grep", "IWE grep")
  iwe_buf_map(bufnr, "n", "<Leader>nb", iwe_cmd "backlinks", "IWE backlinks")
  iwe_buf_map(bufnr, "n", "<Leader>nB", iwe_cmd "blockreferences", "IWE block references")
  iwe_buf_map(bufnr, "n", "<Leader>nh", iwe_cmd "headers", "IWE headers")
  iwe_buf_map(bufnr, "n", "<Leader>nl", iwe_cmd "lsp status", "IWE LSP status")
  iwe_buf_map(bufnr, "n", "<Leader>nR", function() vim.lsp.buf.rename() end, "IWE rename note/link")
  iwe_buf_map(bufnr, "n", "<Leader>na", function() vim.lsp.buf.code_action() end, "IWE code actions")
  iwe_buf_map(bufnr, "n", "<Leader>ne", function()
    vim.lsp.buf.code_action { apply = true, context = { only = { "refactor.extract.section" } } }
  end, "IWE extract section")
  iwe_buf_map(bufnr, "n", "<Leader>ni", function()
    vim.lsp.buf.code_action { apply = true, context = { only = { "refactor.inline.reference" } } }
  end, "IWE inline reference")
end

---@type LazySpec
return {
  {
    "iwe-org/iwe.nvim",
    ft = "markdown",
    cmd = "IWE",
    dependencies = { "folke/snacks.nvim" },
    opts = {
      lsp = {
        cmd = { "iwes" },
        auto_format_on_save = false,
        enable_inlay_hints = true,
        enable_folding = true,
      },
      mappings = {
        enable_markdown_mappings = false,
        enable_picker_keybindings = false,
        enable_telescope_keybindings = false,
        enable_lsp_keybindings = false,
        enable_preview_keybindings = false,
      },
      picker = {
        backend = "snacks",
        fallback_notify = false,
      },
      telescope = {
        enabled = false,
        setup_config = false,
      },
      preview = {
        output_dir = vim.fn.expand "~/tmp/iwe-preview",
        auto_open = false,
      },
    },
    config = function(_, opts) require("iwe").setup(opts) end,
  },
  {
    "AstroNvim/astrocore",
    ---@type AstroCoreOpts
    opts = {
      autocmds = {
        iwe_markdown_mappings = {
          {
            event = "FileType",
            pattern = "markdown",
            desc = "Set IWE-only Markdown mappings inside .iwe workspaces",
            callback = function(args) setup_iwe_buffer(args.buf) end,
          },
        },
      },
    },
  },
}
