define(['socket.io', 'jquery'], function(io, $) {
    var socket = io.connect(location.host);

    $(document).ready(function() {
        var clsHide = 'hidden';
        var $notification = $('.notification');
        var $login = $('.login');
        var $user = $('.user');
        var $todo = $('.todo');
        var $chat = $('.chat');
        var $tasks = $('.tasks');
        var $messages = $('.messages');
        var localName = 'me';
        var user = null;

        var toggleGUI = function(authOk) {
            $login.toggleClass(clsHide, !!authOk);
            $user.toggleClass(clsHide, !authOk);
            $chat.toggleClass(clsHide, !authOk);
            $todo.toggleClass(clsHide, !authOk);
        };

        var displayUser = function(name) {
            $('.username span').text(name);
        };

        var notification = function(message) {
            $notification.html(message);
        };

        var connect = function(login) {
            user = login;
            displayUser(login);
            toggleGUI(true);
            notification('You are connected!');
        };

        var disconnect = function() {
            user = null;
            displayUser('');
            toggleGUI(false);
            notification('You have been disconnected!');
        };

        var sendLogin = function(login) {
            socket.emit('login', login, function(ok) {
                if (ok) {
                    connect(login);
                } else {
                    notification('You must enter a valid login name to access to the shared todo list!');
                }
            });
        };

        var adjustScroll = function($el) {
            var el = $el && $el.get(0);
            if (el) {
                el.scrollTop = el.scrollHeight;
            }
        };

        var getTaskId = function(el) {
            var $el = $(el);
            if (!$el.is('.task')) {
                $el = $el.closest('.task');
            }
            return $el.find('input').val();
        };

        var addLine = function($list, type, content) {
            var $line = $('<li />').addClass(type);
            if ('string' === typeof content) {
                $line.html(content);
            } else {
                $line.append(content);
            }

            $list.append($line);
            adjustScroll($list);
        };

        var formatMessage = function(login, message) {
            return '<span class="login">' + login + '</span>: <span class="text">' + message + '</span>';
        };

        var formatTask = function(task) {
            return '<span class="id">#' + task.id + '</span> ' +
                   '<input type="checkbox" value="' + task.id + '" ' + (task.checked ? 'checked' : '') + ' /> ' +
                   '<span class="label">' + task.label + '</span><button class="action delete" data-control="remove">Remove</button>';
        };

        $('[data-control="logout"]').click(function(event) {
            socket.emit('logout');
            disconnect();
        });

        $('.connection').submit(function(event) {
            var login = $('[data-control="login"]').val().trim();
            if (login) {
                sendLogin(login);
            } else {
                notification('You must enter a valid login name to access to the shared todo list!');
            }
            event.preventDefault();
        });

        $todo.on('click', 'input[type="checkbox"]', function(event) {
            var $checkbox = $(this);
            var $task = $checkbox.closest('.task');
            var checked = this.checked;
            socket.emit('check', getTaskId(this), checked, function(ok) {
                $task.toggleClass('checked', ok ? checked : !checked);
                if (!ok) {
                    if (!checked) {
                        $checkbox.attr('checked', true);
                    } else {
                        $checkbox.removeAttr('checked');
                    }
                    notification('You cannot check this task!');
                }
            });
        });

        $todo.on('click', 'button[data-control="remove"]', function(event) {
            var checkbox = this;
            socket.emit('remove', getTaskId(this), function(ok) {
                if (ok) {
                    $(checkbox).closest('.task').remove();
                } else {
                    notification('You cannot remove this task!');
                }
            });
        });

        $('form.add').submit(function(event) {
            var $input = $('[data-control="task"]');
            var task = $input.val();
            $input.val('').focus();

            if (task) {
                socket.emit('add', task);
            }

            event.preventDefault();
        });

        $('form.talk').submit(function(event) {
            var $input = $('[data-control="message"]');
            var message = $input.val();
            $input.val('').focus();

            if (message) {
                addLine($messages, 'message me', formatMessage(localName, message));
                socket.emit('message', message);
            }

            event.preventDefault();
        });

        socket.on('connect', function() {
            if (user) {
                sendLogin(user);
            }
        });

        socket.on('system', function(info) {
            addLine($messages, 'system', info);
        });

        socket.on('message', function(info) {
            addLine($messages, 'message others', formatMessage(info.login, info.message));
        });

        socket.on('messages', function(messages) {
            $messages.empty();
            messages && messages.forEach(function(chunk) {
                if (chunk.login !== user) {
                    addLine($messages, 'message others', formatMessage(chunk.login, chunk.message));
                } else {
                    addLine($messages, 'message me', formatMessage(localName, chunk.message));
                }

            });
        });

        socket.on('tasks', function(tasks) {
            $tasks.empty();
            tasks && tasks.forEach(function(task) {
                addLine($tasks, 'task' + (task.checked ? ' checked' : ''), formatTask(task));
            });
        });

        socket.on('add', function(task) {
            addLine($tasks, 'task' + (task.checked ? ' checked' : ''), formatTask(task));
        });

        socket.on('check', function(task) {
            var $input = $tasks.find('input[value="' + task.id + '"]');
            var $task = $input.closest('.task');

            $task.toggleClass('checked', task.checked);

            if (task.checked) {
                $input.attr('checked', 'checked');
            } else {
                $input.removeAttr('checked');
            }
        });

        socket.on('remove', function(task) {
            $tasks.find('input[value="' + task.id + '"]').closest('.task').remove();
        });
    });
});

