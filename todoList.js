module.exports = function todoList() {
    var instance = {
        init: function init() {
            this._ids = 0;
            this._tasks = {};
            return this;
        },

        get: function get(id) {
            return this._tasks[id];
        },

        add: function add(text) {
            var task = {
                id: ++ this._ids,
                label: text,
                checked: false
            } ;
            this._tasks[task.id] = task;
            return task;
        },

        remove: function remove(id) {
            var task = this.get(id);
            var tasks = this._tasks;
            var shrinked = {};
            if (task) {
                Object.keys(this._tasks).forEach(function(key) {
                    if (key !== id) {
                        shrinked[key] = tasks[key];
                    }
                });
                this._tasks = shrinked;
            }
            return task;
        },

        check: function check(id, flag) {
            var task = this.get(id);
            if (task) {
                task.checked = !!flag;
            }
            return task;
        },

        list: function list() {
            var tasks = this._tasks;
            return Object.keys(tasks).map(function(key) {
                return tasks[key]
            });
        }

    };

    return instance.init();
};
