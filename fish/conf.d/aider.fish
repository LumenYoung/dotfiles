# aider specific settings

set -x AIDER_DARK_MODE true
set -x AIDER_AUTO_COMMITS false
set -x AIDER_GITIGNORE false
set -x AIDER_VIM true
# set -x AIDER_SONNET true
# set -x AIDER_DEEPSEEK true
set -x AIDER_SUGGEST_SHELL_COMMANDS false
set -x AIDER_SHOW_RELEASE_NOTES false
set -x AIDER_ARCHITECT false
set -x AIDER_EDIT_FORMAT diff-fenced
# set -x AIDER_EDITOR_MODEL openrouter/deepseek/deepseek-chat-v3-0324
set -x AIDER_CACHE_PROMPTS true
# alias aider="aider --model openrouter/anthropic/claude-3.5-sonnet"

abbr aiderm 'aider -m "'

###################### Model Arena ##########################

# set -x AIDER_MODEL openrouter/google/gemini-2.5-pro
# set -x AIDER_MODEL openrouter/anthropic/claude-sonnet-4
# set -x AIDER_MODEL openrouter/deepseek/deepseek-r1-0528
set -x AIDER_MODEL openrouter/x-ai/grok-4
