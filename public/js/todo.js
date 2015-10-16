define(['socket.io', 'jquery'], function(io, $) {
    // connect the page to the server as soon as possible
    var socket = io.connect(location.host);

    // build the interface when the page is ready
    $(document).ready(function() {
        var clsHide = 'hidden';
        var clsChecked = 'checked';

        var $notification = $('.notification');
        var $login = $('.login');
        var $user = $('.user');
        var $todo = $('.todo');
        var $chat = $('.chat');
        var $tasks = $('.tasks');
        var $messages = $('.messages');
        var $userName = $('.username span');

        var $formLogin = $('.connection');
        var $formTask = $('form.add');
        var $formMessage = $('form.talk');

        var $inputLogin = $('[data-control="login"]');
        var $inputMessage = $('[data-control="message"]');
        var $inputTask = $('[data-control="task"]');

        var $buttonLogout = $('[data-control="logout"]');

        var localName = 'me';
        var user = null;

        /**
         * Toggles the interface between logged in et logged out states
         * @param {Boolean} authOk
         */
        var toggleGUI = function(authOk) {
            $login.toggleClass(clsHide, !!authOk);
            $user.toggleClass(clsHide, !authOk);
            $chat.toggleClass(clsHide, !authOk);
            $todo.toggleClass(clsHide, !authOk);
        };

        /**
         * Updates the interface with the name of the logged in user
         * @param {String} name
         */
        var displayUser = function(name) {
            $userName.text(name);
        };

        /**
         * Displays a notification message
         * @param {String} message
         */
        var notification = function(message) {
            $notification.html(message);
        };

        /**
         * Connects a user
         * @param {String} login
         */
        var connect = function(login) {
            user = login;
            displayUser(login);
            toggleGUI(true);
            notification('You are connected!');
            $inputMessage.focus();
        };

        /**
         * Disconnects the user
         */
        var disconnect = function() {
            user = null;
            displayUser('');
            toggleGUI(false);
            notification('You have been disconnected!');
            $inputLogin.focus();
        };

        /**
         * Sends a login attempts to the server
         * @param {String} login
         */
        var sendLogin = function(login) {
            socket.emit('login', login, function(ok) {
                if (ok) {
                    connect(login);
                } else {
                    notification('You must enter a valid login name to access to the shared todo list!');
                }
            });
        };

        /**
         * Scroll down a list to the last element
         * @param {jQuery} $el
         */
        var adjustScroll = function($el) {
            var el = $el && $el.get(0);
            if (el) {
                el.scrollTop = el.scrollHeight;
            }
        };

        /**
         * Gets the task id related to a line
         * @param {jQuery|String|HTMLElement} el
         * @returns {String}
         */
        var getTaskId = function(el) {
            var $el = $(el);
            if (!$el.is('.task')) {
                $el = $el.closest('.task');
            }
            return $el.find('input').val();
        };

        /**
         * Adds a line into a list
         * @param {jQuery} $list
         * @param {String} type
         * @param {String|jQuery} content
         */
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

        /**
         * Formats a message
         * @param {String} login
         * @param {String} message
         * @returns {String}
         */
        var formatMessage = function(login, message) {
            return '<span class="login">' + login + '</span>: <span class="text">' + message + '</span>';
        };

        /**
         * Formats a task
         * @param {Object} task
         * @returns {String}
         */
        var formatTask = function(task) {
            return '<span class="id">#' + task.id + '</span> ' +
                   '<input type="checkbox" value="' + task.id + '" ' + (task.checked ? 'checked' : '') + ' /> ' +
                   '<span class="label">' + task.label + '</span><button class="action delete" data-control="remove">Remove</button>';
        };

        /**
         * Reads an input, then reset it
         * @param {jQuery|String|HTMLElement} input
         * @returns {String}
         */
        var readInput = function(input) {
            var $input = $(input);
            var value = $input.val();
            $input.val('').focus();
            return value;
        }

        // handles the logout action
        $buttonLogout.click(function() {
            // tell the server
            socket.emit('logout');

            // update the interface
            disconnect();
        });

        // handles the login action
        $formLogin.submit(function(event) {
            var login = readInput($inputLogin).trim();
            if (login) {
                // send to the server
                sendLogin(login);
            } else {
                // no login entered
                notification('You must enter a valid login name to access to the shared todo list!');
            }
            event.preventDefault();
        });

        // handles tasks check
        $todo.on('click', 'input[type="checkbox"]', function() {
            var $checkbox = $(this);
            var $task = $checkbox.closest('.task');
            var checked = this.checked;

            // tell the server about the change
            socket.emit('check', getTaskId(this), checked, function(ok) {
                $task.toggleClass(clsChecked, ok ? checked : !checked);

                // server refused the change, so we need to rollback
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

        // handles tasks remove
        $todo.on('click', 'button[data-control="remove"]', function() {
            var checkbox = this;

            // just tell the server about the change
            // another event will be emitted by the server to update the list
            socket.emit('remove', getTaskId(this), function(ok) {
                if (ok) {
                    $(checkbox).closest('.task').remove();
                } else {
                    notification('You cannot remove this task!');
                }
            });
        });

        // handles the task add action
        $formTask.submit(function(event) {
            var task = readInput($inputTask);

            if (task) {
                // just tell the server about the change
                // another event will be emitted by the server to update the list
                socket.emit('add', task);
            }

            event.preventDefault();
        });

        // handles the message send action
        $formMessage.submit(function(event) {
            var message = readInput($inputMessage);

            if (message) {
                // display the message inside the page
                addLine($messages, 'message me', formatMessage(localName, message));

                // and tell the server
                socket.emit('message', message);
            }

            event.preventDefault();
        });

        // put the focus on the login form
        $inputLogin.focus();

        // when the page is connected, send the user login, if any
        socket.on('connect', function() {
            if (user) {
                sendLogin(user);
            }
        });

        // take care of system messages sent by the server
        socket.on('system', function(info) {
            addLine($messages, 'system', info);
        });

        // take care of messages sent by the others
        socket.on('message', function(info) {
            addLine($messages, 'message others', formatMessage(info.login, info.message));
        });

        // update the whole list of messages
        socket.on('messages', function(messages) {
            // first erase the list
            $messages.empty();

            // then fill it with the received list
            messages && messages.forEach(function(chunk) {
                if (chunk.login !== user) {
                    // message from others
                    addLine($messages, 'message others', formatMessage(chunk.login, chunk.message));
                } else {
                    // message from the current user
                    addLine($messages, 'message me', formatMessage(localName, chunk.message));
                }

            });
        });

        // update the whole list of tasks
        socket.on('tasks', function(tasks) {
            // first erase the list
            $tasks.empty();

            // then fill it with the received list
            tasks && tasks.forEach(function(task) {
                addLine($tasks, 'task' + (task.checked ? ' ' + clsChecked : ''), formatTask(task));
            });
        });

        // take care of tasks added by others
        socket.on('add', function(task) {
            addLine($tasks, 'task' + (task.checked ? ' ' + clsChecked : ''), formatTask(task));
        });

        // take care of checked tasks
        socket.on('check', function(task) {
            var $input = $tasks.find('input[value="' + task.id + '"]');
            var $task = $input.closest('.task');

            // update the visual style
            $task.toggleClass(clsChecked, task.checked);

            // update the checkbox state
            if (task.checked) {
                $input.attr('checked', 'checked');
            } else {
                $input.removeAttr('checked');
            }
        });

        // take care of tasks removals
        socket.on('remove', function(task) {
            $tasks.find('input[value="' + task.id + '"]').closest('.task').remove();
        });
    });
});

