Pinax.oop.declare("pinax.FormEdit.selectfromontology", {
    $extends: Pinax.oop.get('pinax.FormEdit.standard'),

    initialize: function (element) {
        element.data('instance', this);
        this.$element = element;

        var self = this;
        element.removeAttr('value');
        element.css('width', '500px');

        var fieldName = element.data('field') || element.attr('name');
        var multiple = element.data('multiple');
        var addNewValues = element.data('add_new_values');
        var model = element.data('model');
        var query = element.data('query');
        var proxy = element.data('proxy');
        var proxySecondLevel = element.data('proxysecondlevel');
        var proxyParams = element.data('proxy_params');
        if (typeof (proxyParams) == 'string') {
            proxyParams = proxyParams.replace(/##/g, '"');
        } else {
            proxyParams = JSON.stringify(proxyParams);
        }
        var placeholder = element.data('placeholder');
        var originalName = element.data('originalName');
        var getId = element.data('get_id');
        var minimumInputLength = element.data('min_input_length') || 0;
        var formatSelection = element.data('format_selection');
        var formatResult = element.data('format_result');

        if (originalName !== undefined && element.data('override') !== false) {
            fieldName = originalName;
        }

        var el = element;

        element.select2({
            width: 'off',
            height: 250,
            multiple: multiple,
            minimumInputLength: minimumInputLength,
            placeholder: placeholder === undefined ? '' : placeholder,
            closeOnSelect: false,
            allowClear: true,
            initSelection: function (element, callback) {

            },
            ajax: {
                url: Pinax.baseUrl.replace('metafad','peb') + "/admin/rest/ontologypicker",
                dataType: 'json',
                type: 'POST',
                quietMillis: 250,
                data: function (term, page) {
                    return {
                        term: term
                    };
                },
                results: function (data, page) {
                    return {
                        results: data
                    }
                }
            },
            createSearchChoice: function (term, data) {
                if (!addNewValues) {
                    return false;
                }

                if ($(data).filter(function () {
                        return this.text.localeCompare(term) === 0;
                    }).length === 0) {
                    return {
                        id: term,
                        text: term
                    };
                }
            },
            formatResult: function (data) {
                return formatResult === undefined ? data.text : window[formatResult](data);
            },
            formatSelection: function (data) {
                return formatSelection === undefined ? data.text : window[formatSelection](data);
            }
        }).on('change', function (e) {
            self.getValue();
        }).on('close', function (e) {
            $('body').find('.select2-results-second-level').html('');
        }).on('click', function (e) {
            $('.select2-disabled').removeClass('select2-disabled').addClass('select2-highlighted').next().removeClass('select2-highlighted');
        });

        //Customize container
        var resultDiv = el.parent().find('ul.select2-results');
        resultDiv.parent().height(320);
        resultDiv.attr('style', 'width:30%;height:320px;max-height:316px !important;float:left;border-right:1px solid #000;font-size:14px;');
        resultDiv.after('<div style="height:96%;">' +
            '<input id="refine-search" name="refine-search" placeholder="Raffina ricerca" style="width:68%;margin-left:10px;position: relative;top: -316px;right: -203px;"/>' +
            '<span id="refine-search-label"><span>' +
            '</div>' +
            '<ul class="select2-results-second-level select2-results" style="width:69%;float:right;max-height:280px;font-size:14px;position: relative;top: -290px;">' +
            '</ul>');
        // ----- //


        element.parent().find('.select2-results').not('.select2-results-second-level').on('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            el.parent().find('.select2-search-choice:last').remove();
            data = el.select2('val');
            var ontologyId = data[data.length - 1];
            $('#refine-search').attr('data-ontologyId', ontologyId);
            data.pop();
            el.select2('val', data);

            $.ajax({
                url: Pinax.baseUrl.replace('metafad','peb') + "/admin/rest/ontologypicker/children",
                dataType: 'json',
                quietMillis: 250,
                type: 'POST',
                data: {
                    term: ontologyId,
                    proxyParams: proxyParams
                },
                complete: function (data) {
                    result = data.responseJSON;
                    var html = '';
                    for (i = 0; i < result.length; i++) {
                        html += '<li class="select2-result">' +
                            '<div class="select2-result-label js-set-tag" onclick="document.setTag(\'' + result[i].id + '\',\'' + result[i].text + '\',\'' + result[i].type + '\')" data-id="' + result[i].id + '">' + result[i].text + '</div>' +
                            '</li>';
                    }
                    $('.select2-results-second-level').html(html);
                }
            });
        });

        var currentRequest = null;
        el.parent().find('#refine-search').on('input', function () {
            var val = $(this).val();
            var ontologyId = $(this).attr('data-ontologyId');
            if (!ontologyId) {
                return;
            }

            currentRequest = $.ajax({
                url: Pinax.baseUrl.replace('metafad','peb') + "/admin/rest/ontologypicker/children",
                dataType: 'json',
                type: 'POST',
                quietMillis: 250,
                data: {
                    term: ontologyId,
                    proxyParams: '{"text":"' + val + '"}'
                },
                beforeSend: function () {
                    if (currentRequest != null) {
                        currentRequest.abort();
                    }
                },
                complete: function (data) {
                    if (data.responseJSON) {
                        result = data.responseJSON;
                        var html = '';
                        for (i = 0; i < result.length; i++) {
                            html += '<li class="select2-result">' +
                                '<div class="select2-result-label js-set-tag" onclick="document.setTag(\'' + result[i].id + '\',\'' + result[i].text + '\',\'' + result[i].type + '\')" data-id="' + result[i].id + '">' + result[i].text + '</div>' +
                                '</li>';
                        }
                        resultDiv.parent().find('.select2-results-second-level').html(html);
                    }
                }
            });
        });

        document.setTag = function (id, text, type) {
            var parent = $('.select2-highlighted').first();
            var value = {
                'id': id,
                'text': text,
                'type': type
            };
            data = el.select2('data');
            data.push(value);
            el.select2('data', data);
            parent.addClass('select2-highlighted');
            $('.select2-results-dept-0').first().removeClass('select2-highlighted');
        }

        if (multiple) {
            var el = element;
            el.parent().find("ul.select2-choices").sortable({
                containment: 'parent',
                start: function () {
                    el.select2("onSortStart");
                },
                update: function () {
                    el.select2("onSortEnd");
                }
            });
        }

        $('body').on('mouseover', '.select2-results-second-level .select2-result .select2-result-label', function () {
            $(this).addClass('select2-highlighted');
        });

        $('body').on('mouseleave', '.select2-results-second-level .select2-result .select2-result-label', function () {
            $(this).removeClass('select2-highlighted');
        });
        
        this.setValue();
    },

    getValue: function () {
        var data;
        if (this.$element.data('return_object')) {
            data = this.$element.select2('data');
        } else {
            data = this.$element.select2('val');
        }
        this.$element.data('origValue', JSON.stringify(data));
        return data;
    },

    setValue: function (value) {
        if (value) {
            var baseValue = value || this.$element.data('origValue');
        var multiple = this.$element.data('multiple');

        try {
            if (Object.prototype.toString.call(baseValue) === '[object Array]') {
                value = baseValue
            } else {
                value = JSON.parse(baseValue);
            }
        } catch (e) {
            value = baseValue;
        }
        if (multiple === undefined || multiple === false) {
            if (value) {
                if (typeof (value) == "object") {
                    this.$element.select2('data', value);
                } else {
                    this.$element.select2('data', {
                        id: value,
                        text: value
                    });
                }
            }
        } else if (Array.isArray(value)) {
            var arrayVal = [];

            $.each(value, function (index, v) {
                if (typeof (v) == "object") {
                    arrayVal.push(v);
                } else {
                    arrayVal.push({
                        id: v,
                        text: v
                    });
                }
            });

            this.$element.select2('data', arrayVal);
        }
        }
    },

    destroy: function (element) {
        element.select2("destroy").off("change");
    },

    focus: function (element) {
        element.select2('focus');
    }
});

function formatSelection(data) {
    return data.text + '<br><small>' + data.type + '</small>';
}

function formatResult(data) {
    return data.text + '<br><small>' + data.type + '</small>';
}