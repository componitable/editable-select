var emitter = require('emitter');
var editable = require('editable');

module.exports = makeEditable;
function makeEditable(elements, options) {
    options = options || {};
    options.getValue = options.getValue || function (element) {
        return editable.attribute(element, 'value') || element.textContent.trim();
    };
    options.setValue = options.setValue || function (element, value) {
        editable.attribute(element, 'value', value);
    };
    if (typeof options.getOptions !== 'function') {
        throw new Error('You must provide getOptions(element, callback(err, res))');
    }
    editable.click(elements, function (element) {
        if (element.getAttribute('data-in-edit-mode') == 'true') return;
        element.setAttribute('data-in-edit-mode', 'true');
        edit(element, options);
    });
}
emitter(makeEditable);

function edit(element, options) {
    var dimensions;
    var oldStyle;
    if (options.maintainSize === true) {
        dimensions = editable.dimensions(element);
    }
    emit('pre-begin-edit', element);;
    options.getOptions(element, function (err, res) {
        var value = options.getValue(element);
        element.innerHTML = '';
        var edit = document.createElement('select');
        edit.innerHTML = res.map(function (option) {
            var buf = ['<option value="', option.value, '"'];
            if (option.value === value) buf.push(' selected');
            if (option.disabled === true) buf.push(' disabled');
            buf.push('>');
            buf.push(option.description);
            buf.push('</option>');
            return buf.join('');
        }).join('');
        element.appendChild(edit);
        if (options.maintainSize === true) {
            var editDimensions = editable.transformDimensions(edit, dimensions);
            edit.style.width = editDimensions.width + 'px';
            edit.style.height = editDimensions.height + 'px';
            oldStyle = {width: element.style.width, height: element.style.height};
            element.style.width = dimensions.width + 'px';
            element.style.height = dimensions.height + 'px';
        }
        edit.focus();
        edit.addEventListener('change', onBlur);
        var checkBlur = setInterval(function () {
            if (document.activeElement != edit) onBlur();
        }, 200);
        function onBlur() {
            if (element.getAttribute('data-in-edit-mode') != 'true') return;
            element.setAttribute('data-in-edit-mode', 'false');
            clearInterval(checkBlur);
            emit('pre-end-edit', element);
            var newOption = res[edit.selectedIndex];
            element.innerHTML = newOption.description;
            options.setValue(element, newOption.value);
            if (options.maintainSize === true) {
                element.style.width = oldStyle.width;
                element.style.height = oldStyle.height;
            }
            if (value != newOption.value) {
                emit('update', element, newOption.value);
            }
            emit('post-end-edit', element);
        }

        emit('post-begin-edit', element);
    });
}

function emit() {
    module.exports.emit.apply(module.exports, arguments);
    editable.emit.apply(editable, arguments);
}