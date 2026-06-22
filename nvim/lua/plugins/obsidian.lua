-- Disabled while evaluating IWE for Markdown knowledge management.
-- Obsidian.nvim overlaps heavily with IWE's note navigation, backlinks,
-- completion, and Markdown link handling, so keep it out of the runtime to
-- avoid keymap/LSP/UI collisions.
if true then return {} end

local workspaces = {
  { name = "public", path = "~/Documents/git/Notes/content", strict = true },
  { name = "public", path = "~/Documents/Silverbullet", strict = true },
  { name = "private", path = "~/obsidian/" },
}

local function workspace_exists(workspace) return vim.fn.isdirectory(vim.fn.expand(workspace.path)) == 1 end

local any_workspace_exists = false
for _, workspace in ipairs(workspaces) do
  if workspace_exists(workspace) then
    any_workspace_exists = true
    break
  end
end

if not any_workspace_exists then return {} end

return {
  "epwalsh/obsidian.nvim",
  dependencies = {
    "nvim-lua/plenary.nvim",
    "hrsh7th/nvim-cmp",
    "nvim-telescope/telescope.nvim",
    {
      "AstroNvim/astrocore",
      opts = {
        options = {
          opt = {
            conceallevel = 1, -- sets vim.opt.conceallevel to 1
          },
        },
        -- mappings = {
        -- n = {
        --   ["<Leader>O"] = { name = "Obsidian" },
        --   ["<Leader>Ot"] = { "<cmd>ObsidianToday<cr>", desc = "Daily note" },
        --   ["<Leader>Oy"] = { "<cmd>ObsidianYesterday<cr>", desc = "Yesterday's note" },
        --   ["<Leader>Of"] = { "<cmd>ObsidianSearch<cr>", desc = "Search notes" },
        --   ["<Leader>Og"] = { "<cmd>ObsidianFollowLink<cr>", desc = "Goto link" },
        --   ["<Leader>Oo"] = { "<cmd>ObsidianOpen<cr>", desc = "Open Obsidian" },
        --   ["<Leader>Oc"] = {
        --     function() return require("obsidian").util.toggle_checkbox() end,
        --     desc = "Toggle checkbox",
        --   },
        --   ["gf"] = {
        --     function()
        --       if require("obsidian").util.cursor_on_markdown_link() then
        --         return "<Cmd>ObsidianFollowLink<CR>"
        --       else
        --         return "gf"
        --       end
        --     end,
        --     desc = "Obsidian Follow Link",
        --   },
        -- },
      },
    },
  },
  opts = {
    -- opts parameter is the default options table
    -- overwrite the entire opts table
    use_advanced_uri = true,
    finder = "telescope.nvim",
    completion = {
      nvim_cmp = true,
      min_chars = 2,
    },
    new_notes_location = "current_dir",
    disable_frontmatter = false,
    callbacks = {
      -- Runs right before writing the buffer for a note.
      ---@param client obsidian.Client
      ---@param note obsidian.Note
      ---@diagnostic disable-next-line: unused-local
      pre_write_note = function(client, note) note:add_field("modified", os.date("%Y-%m-%d")) end,
    },
    note_frontmatter_func = function(note)
      -- Add the title of the note as an alias.
      if note.title then note:add_alias(note.title) end

      local out = { id = note.id, aliases = note.aliases, tags = note.tags }

      -- Add creation date if it doesn't exist and the note has a path
      if not note.metadata.date and note.path and note.path.filename then
        local stat = vim.loop.fs_stat(note.path.filename)
        if stat then
          out.date = os.date("%Y-%m-%d", stat.birthtime.sec)
        end
      end

      -- `note.metadata` contains any manually added fields in the frontmatter.
      -- So here we just make sure those fields are kept in the frontmatter.
      if note.metadata ~= nil and not vim.tbl_isempty(note.metadata) then
        for k, v in pairs(note.metadata) do
          out[k] = v
        end
      end

      return out
    end,
    workspaces = workspaces,
    open_app_foreground = true,
    -- Either 'wiki' or 'markdown'.
    preferred_link_style = "wiki",
    ui = {
      enable = true, -- set to false to disable all additional syntax features
      update_debounce = 200, -- update delay after a text change (in milliseconds)
      max_file_length = 5000, -- disable UI features for files with more than this many lines
      -- Define how various check-boxes are displayed
      checkboxes = {
        -- NOTE: the 'char' value has to be a single character, and the highlight groups are defined below.
        [" "] = { char = "󰄱", hl_group = "ObsidianTodo" },
        ["x"] = { char = "", hl_group = "ObsidianDone" },
        [">"] = { char = "", hl_group = "ObsidianRightArrow" },
        ["~"] = { char = "󰰱", hl_group = "ObsidianTilde" },
        ["!"] = { char = "", hl_group = "ObsidianImportant" },
        -- Replace the above with this if you don't have a patched font:
        -- [" "] = { char = "☐", hl_group = "ObsidianTodo" },
        -- ["x"] = { char = "✔", hl_group = "ObsidianDone" },

        -- You can also add more custom ones...
      },
      -- Use bullet marks for non-checkbox lists.
      bullets = { char = "•", hl_group = "ObsidianBullet" },
      external_link_icon = { char = "", hl_group = "ObsidianExtLinkIcon" },
      -- Replace the above with this if you don't have a patched font:
      -- external_link_icon = { char = "", hl_group = "ObsidianExtLinkIcon" },
      reference_text = { hl_group = "ObsidianRefText" },
      highlight_text = { hl_group = "ObsidianHighlightText" },
      tags = { hl_group = "ObsidianTag" },
      block_ids = { hl_group = "ObsidianBlockID" },
      hl_groups = {
        -- The options are passed directly to `vim.api.nvim_set_hl()`. See `:help nvim_set_hl`.
        ObsidianTodo = { bold = true, fg = "#f78c6c" },
        ObsidianDone = { bold = true, fg = "#89ddff" },
        ObsidianRightArrow = { bold = true, fg = "#f78c6c" },
        ObsidianTilde = { bold = true, fg = "#ff5370" },
        ObsidianImportant = { bold = true, fg = "#d73128" },
        ObsidianBullet = { bold = true, fg = "#89ddff" },
        ObsidianRefText = { underline = true, fg = "#c792ea" },
        ObsidianExtLinkIcon = { fg = "#c792ea" },
        ObsidianTag = { italic = true, fg = "#89ddff" },
        ObsidianBlockID = { italic = true, fg = "#89ddff" },
        ObsidianHighlightText = { bg = "#75662e" },
      },
    },
  },
}
