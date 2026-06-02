function __ssh_agent_is_started -d "check if ssh agent is already started"
   if begin; test -f $SSH_ENV; and test -z "$SSH_AGENT_PID"; end
      source $SSH_ENV > /dev/null
   end

   if test -z "$SSH_AGENT_PID"
      return 1
   end

   ps -ef | grep $SSH_AGENT_PID | grep -v grep | grep -q ssh-agent
   #pgrep ssh-agent
   return $status
end


function __ssh_agent_start -d "start a new ssh agent"
   ssh-agent -c | sed 's/^echo/#echo/' > $SSH_ENV
   chmod 600 $SSH_ENV
   source $SSH_ENV > /dev/null
   true  # suppress errors from setenv, i.e. set -gx
end


function fish_ssh_agent --description "Start ssh-agent if not started yet, or uses already started ssh-agent."
   # If the environment already provides an agent socket, keep it.
   # This matters for desktop agents such as gcr/gnome-keyring and for
   # forwarded SSH agents over `ssh -A`: those usually set SSH_AUTH_SOCK but
   # not SSH_AGENT_PID.  The old logic treated missing SSH_AGENT_PID as "no
   # agent" and overwrote SSH_AUTH_SOCK with ~/.ssh/environment, which made
   # keys appear to be lost after `exec fish`.
   # Do not probe it with `ssh-add -l`: that can fail for reasons unrelated to
   # socket validity, and then we would incorrectly replace the inherited
   # forwarded agent with a fresh local agent.
   if test -n "$SSH_AUTH_SOCK"; and test -S "$SSH_AUTH_SOCK"
      return 0
   end

   if test -z "$SSH_ENV"
      set -xg SSH_ENV $HOME/.ssh/environment
   end

   if not __ssh_agent_is_started
      __ssh_agent_start
   end
end
