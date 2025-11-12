return {
  "AstroNvim/astrocore",
  ---@param opts AstroCoreOpts
  opts = function(_, opts)
    local nmaps = opts.mappings.n
    -- Dap telescope
    -- nmaps["<Leader>dw"] = {
    --   function() require("telescope").extensions.dap.configurations() end,
    --   desc = "Configurations",
    -- }
    local Snacks = require "snacks"

    for lhs, key in pairs(nmaps) do
      local new_lhs, matches = lhs:gsub("^<Leader>f", "<Leader>s")
      if matches > 0 then
        nmaps[lhs] = nil
        nmaps[new_lhs] = key
      end
    end

    nmaps["<Leader>st"] = {
      function() Snacks.picker.grep() end,
      desc = "Text",
    }

    nmaps["<Leader>lV"] = { "<cmd>lua vim.diagnostic.config({virtual_text = false})<cr>", desc = "VirtualText Off" }
    nmaps["<Leader>lv"] = { "<cmd>lua vim.diagnostic.config({virtual_text = true})<cr>", desc = "VirtualText On" }
    nmaps["<Leader>="] = { desc = "Custom Keys" }
    nmaps["<Leader>=w"] = { "<cmd>set wrap<cr>", desc = "Wrap" }
    nmaps["<Leader>=W"] = { "<cmd>set nowrap<cr>", desc = "Unwrap" }
    nmaps["<Leader>=t"] = { "<cmd>Hardtime toggle<cr>", desc = "Toggle Hardtime" }
    -- Preserve <number><C-\> functionality while adding float toggle
    -- nmaps["<C-\\>"] = {
    --   function()
    --     if vim.v.count == 0 then
    --       vim.cmd "ToggleTerm direction=float"
    --     else
    --       vim.cmd(vim.v.count .. "ToggleTerm")
    --     end
    --   end,
    --   desc = "ToggleTerm (float if no count)",
    -- }

    -- -- Example: disable default leader-f mappings
    -- for lhs, _ in pairs(nmaps) do
    --   if lhs:match "^<Leader>f" then nmaps[lhs] = nil end
    -- end

    nmaps["<Leader>f"] = { function() Snacks.picker.files() end, desc = "Find files" }

    nmaps["<Leader>bf"] = {
      function()
        require("telescope.builtin").buffers {
          show_all_buffers = true,
          sort_lastused = true,
          ignore_current_buffer = true,
        }
      end,
      desc = "Buffers",
    }

    -- Yank current buffer's full path and line number
    nmaps["<Leader>yp"] = {
      function()
        local path = vim.fn.expand "%:p"
        local line_number = vim.fn.line "."
        local yank_text = path .. ":" .. line_number

        -- Use setreg to let the configured clipboard provider handle the copy
        vim.fn.setreg("+", yank_text)
        vim.fn.setreg("*", yank_text)

        vim.notify("Yanked: " .. yank_text, vim.log.levels.INFO)
      end,
      desc = "Yank file path and line number",
    }
  end,
}
