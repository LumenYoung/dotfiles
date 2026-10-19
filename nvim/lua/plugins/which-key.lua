return {
  "folke/which-key.nvim",
  opts = function(_, opts)
    opts.spec = opts.spec or {}
    -- Keep direct tab shortcuts working without crowding the leader popup.
    for i = 1, 9 do
      table.insert(opts.spec, { "<Leader>" .. i, mode = "n", hidden = true })
    end
    table.insert(opts.spec, { "<Leader>t0", mode = "n", hidden = true })
  end,
}
