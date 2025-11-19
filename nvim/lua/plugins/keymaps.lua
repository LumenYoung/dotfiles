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

    local function copy_osc52(text)
      vim.fn.setreg("+", text)
      vim.fn.setreg("*", text)
      local ok, osc52 = pcall(require, "vim.ui.clipboard.osc52")
      if ok then
        osc52.copy("+")({ text })
        osc52.copy("*")({ text })
      end
      vim.notify("Yanked: " .. text, vim.log.levels.INFO)
    end

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
    nmaps["<Leader>yl"] = {
      function()
        local path = vim.fn.expand "%:p"
        local line_number = vim.fn.line "."
        copy_osc52(path .. ":" .. line_number)
      end,
      desc = "Yank file path and line number",
    }

    -- Yank relative path (without line number)
    nmaps["<Leader>yr"] = {
      function()
        local path = vim.fn.expand "%:."
        copy_osc52(path)
      end,
      desc = "Yank relative file path",
    }

    -- Yank absolute path (without line number)
    nmaps["<Leader>yp"] = {
      function()
        local path = vim.fn.expand "%:p"
        copy_osc52(path)
      end,
      desc = "Yank absolute file path",
    }
  end,
}
