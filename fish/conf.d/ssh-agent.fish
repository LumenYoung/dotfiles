# Reuse/start ssh-agent for interactive fish sessions.
# Function sourced from https://github.com/ivakyb/fish_ssh_agent
if status is-interactive
    fish_ssh_agent
end
