return {
  'chomosuke/typst-preview.nvim',
  ft = 'typst',
  version = '*',
  opts = {
    dependencies_bin = { ['tinymist'] = 'tinymist' }
  }, -- lazy.nvim will implicitly calls `setup {}`
}
