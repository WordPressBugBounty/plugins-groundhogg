( function ($) {

  const {
    toggle,
    textarea,
    input,
    select,
    inputWithReplacements,
    uuid,
    inputRepeaterWidget,
    inputRepeater,
    icons,
    miniModal,
    tooltip,
    copyObject,
    tinymceElement,
    sanitizeKey,
    isString,
  } = Groundhogg.element
  const { sprintf, __, _x, _n } = wp.i18n
  const { tags: TagsStore } = Groundhogg.stores
  const {
    metaPicker,
    tagPicker,
  } = Groundhogg.pickers

  const columnClasses = {
    '1/1': 'col-1-of-1',
    '1/2': 'col-1-of-2',
    '1/3': 'col-1-of-3',
    '1/4': 'col-1-of-4',
    '2/3': 'col-2-of-3',
    '3/4': 'col-3-of-4',
  }

  const defaultField = {
    className: '',
    id: '',
    type: 'text',
    name: '',
    value: '',
    label: '',
    hide_label: false,
    required: false,
    column_width: '1/1',
  }

  const fieldGroups = {
    contact: __('Contact Info'),
    address: __('Address'),
    compliance: __('Compliance'),
    custom: __('Custom'),
  }

  const defaultForm = {
    button: {
      type: 'button',
      text: 'Submit',
      label: 'Submit',
      column_width: '1/1',
    },
    recaptcha: {
      type: 'recaptcha',
      label: 'reCAPTCHA',
      text: 'reCAPTCHA',
      column_width: '1/1',
      enabled: false,
      required: true,
    },
    fields: [
      {
        ...defaultField,
        type: 'first',
        name: 'first_name',
        label: 'First Name',
        required: true,
      },
      {
        ...defaultField,
        type: 'last',
        name: 'last_name',
        label: 'Last Name',
        required: true,
      },
      {
        ...defaultField,
        type: 'email',
        name: 'email',
        label: 'Email',
        required: true,
      },
    ],
  }

  const getCustomProperties = () => Object.values(Groundhogg.filters.gh_contact_custom_properties.fields)
  const getCustomPropertiesAsOptGroups = ( selected ) => {

    const {
      groups = [],
      fields = [],
      tabs = []
    } = Groundhogg.filters.gh_contact_custom_properties

    let optGroups = []

    groups.forEach(group => {

      let tab = tabs.find( t => t.id === group.tab )
      let subFields = fields.filter( f => f.group === group.id )

      optGroups.push({
        name: `${tab.name}: ${group.name}`,
        options: subFields,
      })
    })

    return optGroups.map(({
      name,
      options
    }) => `<optgroup label="${ name }">${ options.map(
      field => `<option value="${ field.id }" ${ field.id === selected ? 'selected' : '' }>${ field.label }</option>`).join('') }</optgroup>`).join('')
  }

  const Settings = {

    basic (label, atts) {
      const { id } = atts
      // language=html
      return `<label for="${ id }">${ label }</label>
      <div class="setting">${ input(atts) }</div>`
    },
    basicWithReplacements (label, atts) {
      const { id } = atts
      return `<label for="${ id }">${ label }</label> ${ inputWithReplacements(atts) }`
    },

    html: {
      type: 'html',
      edit ({ html = '' }) {
        //language=HTML
        return `${ textarea({ id: 'html-content', value: html }) }`
      },
      onMount (field, updateField) {
        wp.editor.remove('html-content')
        tinymceElement('html-content', {
          quicktags: false,
          tinymce: {
            height: 100,
          },
        }, (content) => {
          updateField({
            html: content,
          })
        })

      },
    },
    type: {
      type: 'type',
      edit ({ type = 'text' }) {

        const options = []

        for (let group in fieldGroups) {

          let optgroup = []

          for (const _type in FieldTypes) {

            if (FieldTypes.hasOwnProperty(_type) && FieldTypes[_type].hasOwnProperty('name') &&
              !FieldTypes[_type].hasOwnProperty('hide') && FieldTypes[_type].group === group) {

              optgroup.push(
                `<option value="${ _type }" ${ type === _type ? 'selected' : '' }>${ FieldTypes[_type].name }</option>`)
            }
          }

          options.push(`<optgroup label="${ fieldGroups[group] }">${ optgroup.join('') }</optgroup>`)
        }

        //language=HTML
        return `<label for="type">Type</label>
        <div class="setting">
            <select id="type" name="type">
                ${ options.join('') }
            </select>
        </div>`
      },
      onMount (field, updateField) {
        $('#type').on('change', (e) => {
          updateField({
            type: e.target.value,
          }, true)
        })
      },
    },
    property: {
      type: 'property',
      edit ({ property = false }) {
        //language=HTML
        return `<label for="type">${ __('Custom Field') }</label>
        <div class="setting">
            <select id="property" name="property">
                ${getCustomPropertiesAsOptGroups( property )}
            </select>
        </div>`
      },
      onMount (field, updateField) {
        $('#property').on('change', (e) => {

          let property = e.target.value
          let label = getCustomProperties().find(f => f.id === property).label
          updateField({
            property,
            label,
          }, true)
        })
      },
    },
    tags: {
      type: 'tags',
      edit () {
        //language=HTML
        return `<label>${ __('Apply Tags') }</label>
        <div class="setting skeleton-loading" id="apply-tags"></div>`
      },
      async onMount ({ tags = [] }, updateField) {

        if ( tags.length ){
          await TagsStore.maybeFetchItems( tags )
        }

        morphdom( document.getElementById( 'apply-tags' ), Groundhogg.components.TagPicker({
          id: 'apply-tags',
          tagIds: tags,
          onChange: tags => updateField({
            tags
          })
        }) )
      },
    },
    name: {
      type: 'name',
      edit ({ name = '' }) {
        //language=HTML
        return `<label for="type">${ __('Internal Name', 'groundhogg') }</label>
        <div class="setting">
            ${ input({
                id: 'name',
                name: 'name',
                value: name,
            }) }
        </div>`
      },
      onMount (field, updateField) {
        metaPicker('#name').on('change input', (e) => {
          updateField({
            name: e.target.value,
          })
        })
      },
    },
    required: {
      type: 'required',
      edit ({ required = false }) {
        //language=HTML
        return `<label for="required">${ __('Required', 'groundhogg') }</label>
        <div class="setting">${ toggle({
            id: 'required',
            name: 'required',
            className: 'required',
            onLabel: 'Yes',
            offLabel: 'No',
            checked: required,
        }) }
        </div>`
      },
      onMount (field, updateField) {
        $('#required').on('change', (e) => {
          updateField({
            required: e.target.checked,
          })
        })
      },
    },
    enabled: {
      type: 'enabled',
      edit ({ enabled = false }) {
        //language=HTML
        return `<label for="enabled">${ __('Enabled', 'groundhogg') }</label>
        <div class="setting">${ toggle({
            id: 'enabled',
            name: 'enabled',
            className: 'enabled',
            onLabel: 'Yes',
            offLabel: 'No',
            checked: enabled,
        }) }
        </div>`
      },
      onMount (field, updateField) {
        $('#enabled').on('change', (e) => {
          updateField({
            enabled: e.target.checked,
          })
        })
      },
    },
    checked: {
      type: 'checked',
      edit ({ checked = false }) {
        //language=HTML
        return `<label for="required">${ __('Checked by default', 'groundhogg') }</label>
        <div class="setting">${ toggle({
            id: 'checked',
            name: 'checked',
            className: 'checked',
            onLabel: 'Yes',
            offLabel: 'No',
            checked,
        }) }
        </div>`
      },
      onMount (field, updateField) {
        $('#checked').on('change', (e) => {
          updateField({
            checked: e.target.checked,
          })
        })
      },
    },
    multiple: {
      type: 'multiple',
      edit ({ multiple = false }) {
        //language=HTML
        return `<label for="multiple">${ __('Allow multiple selections', 'groundhogg') }</label>
        <div class="setting">${ toggle({
            id: 'allow-multiple',
            name: 'multiple',
            className: 'multiple',
            onLabel: 'Yes',
            offLabel: 'No',
            checked: multiple,
        }) }
        </div>`
      },
      onMount (field, updateField) {
        $('#allow-multiple').on('change', (e) => {
          updateField({
            multiple: e.target.checked,
          })
        })
      },
    },
    label: {
      type: 'label',
      edit ({ label = '' }) {
        return Settings.basic('Label', {
          id: 'label',
          name: 'label',
          className: 'label',
          value: label,
          placeholder: '',
        })
      },
      onMount (field, updateField) {

        $('#label').on('change input', (e) => {

          let label = e.target.value

          updateField({
            label,
          })

          if (!field.name) {
            $('#name').val(sanitizeKey(label)).trigger('change')
          }
        })
      },
    },
    hideLabel: {
      type: 'hideLabel',
      edit ({ hide_label = false }) {
        //language=HTML
        return `<label for="hide-label">Hide label</label>
        <div class="setting">${ toggle({
            id: 'hide-label',
            name: 'hide_label',
            className: 'hide-label',
            onLabel: 'Yes',
            offLabel: 'No',
            checked: hide_label,
        }) }
        </div>`
      },
      onMount (field, updateField) {
        $('#hide-label').on('change', (e) => {
          updateField({
            hide_label: e.target.checked,
          })
        })
      },
    },
    redact   : {
      type: 'redact',
      edit ({ redact = 0 }) {
        //language=HTML
        return `<label for="hide-label">Redact this field?</label>
        <div class="setting">${ select({
            id       : 'should-redact',
            name     : 'should_redact',
            className: 'should-redact',
            options : {
                0 : 'Don\'t redact',
                1 : 'After 1 hour',
                6 : 'After 6 hours',
                12: 'After 12 hours',
                24: 'After 1 day',
            },
            selected: redact,
        }) }
        </div>`
      },
      onMount (field, updateField) {
        $('#should-redact').on('change', (e) => {
          updateField({
            redact: e.target.value,
          })
        })
      },
    },
    text: {
      type: 'text',
      edit ({ text = '' }) {
        return Settings.basic('Button Text', {
          id: 'text',
          name: 'text',
          className: 'text regular-text',
          value: text,
          placeholder: '',
        })
      },
      onMount (field, updateField) {
        $('#text').on('change input', (e) => {
          updateField({
            text: e.target.value,
          })
        })
      },
    },
    value: {
      type: 'value',
      edit ({ value = '' }) {
        return Settings.basicWithReplacements('Value', {
          id: 'value',
          name: 'value',
          className: 'value regular-text',
          value: value,
          placeholder: '',
        })
      },
      onMount (field, updateField) {
        $('#value').on('change input', (e) => {
          updateField({
            value: e.target.value,
          })
        })
      },
    },
    placeholder: {
      type: 'placeholder',
      edit ({ placeholder = '' }) {
        return Settings.basic('Placeholder', {
          id: 'placeholder',
          name: 'Placeholder',
          className: 'placeholder',
          value: placeholder,
          placeholder: '',
        })
      },
      onMount (field, updateField) {
        $('#placeholder').on('change input', (e) => {
          updateField({
            placeholder: e.target.value,
          })
        })
      },
    },
    id: {
      type: 'id',
      edit ({ id = '' }) {
        return Settings.basic('CSS Id', {
          id: 'css-id',
          name: 'id',
          className: 'css-id',
          value: id,
          placeholder: 'css-id',
        })
      },
      onMount (field, updateField) {
        $('#css-id').on('change input', (e) => {
          updateField({
            id: e.target.value,
          })
        })
      },
    },
    className: {
      type: 'className',
      edit ({ className = '' }) {
        return Settings.basic('CSS Class', {
          id: 'className',
          name: 'className',
          className: 'css-class-name',
          value: className,
          placeholder: 'css-class-name',
        })
      },
      onMount (field, updateField) {
        $('#className').on('change input', (e) => {
          updateField({
            className: e.target.value,
          })
        })
      },
    },
    phoneType: {
      type: 'phoneType',
      edit ({ phone_type = 'primary' }) {
        //language=HTML
        return `<label for="phone-type">${ _x('Phone Type', 'form field setting', 'groundhogg') }</label>
        <div class="setting">${ select({
            id: 'phone-type',
            name: 'phone_type',
            className: 'phone-type',
        }, {
            primary: 'Primary Phone',
            mobile: 'Mobile Phone',
            company: 'Company Phone',
        }, phone_type) }
        </div>`
      },
      onMount (field, updateField) {
        $('#phone-type').on('change', (e) => {
          updateField({
            phone_type: e.target.value,
          })
        })
      },
    },
    columnWidth: {
      type: 'columnWidth',
      edit ({ column_width }) {
        //language=HTML
        return `<label for="column-width">Column Width</label>
        <div class="setting">${ select({
            id: 'column-width',
            name: 'column_width',
            className: 'column-width',
        }, {
            '1/1': '1/1',
            '1/2': '1/2',
            '1/3': '1/3',
            '1/4': '1/4',
            '2/3': '2/3',
            '3/4': '3/4',
        }, column_width) }
        </div>`
      },
      onMount (field, updateField) {
        $('#column-width').on('change', (e) => {
          updateField({
            column_width: e.target.value,
          })
        })
      },
    },
    captchaTheme: {
      type: 'captchaTheme',
      edit ({ captcha_theme }) {
        //language=HTML
        return `<label for="captcha-theme">Captcha Theme</label>
        <div class="setting">${ select({
            id: 'captcha-theme',
            name: 'captcha_theme',
            className: 'captcha-theme',
        }, {
            'light': 'Light',
            'dark': 'Dark',
        }, captcha_theme) }
        </div>`
      },
      onMount (field, updateField) {
        $('#captcha-theme').on('change', (e) => {
          updateField({
            captcha_theme: e.target.value,
          })
        })
      },
    },
    captchaSize: {
      type: 'captchaSize',
      edit ({ captcha_size }) {
        //language=HTML
        return `<label for="captcha-size">Captcha Size</label>
        <div class="setting">${ select({
            id: 'captcha-size',
            name: 'captcha_size',
            className: 'captcha-size',
        }, {
            'normal': 'Normal',
            'compact': 'Compact',
        }, captcha_size) }
        </div>`
      },
      onMount (field, updateField) {
        $('#captcha-size').on('change', (e) => {
          updateField({
            captcha_size: e.target.value,
          })
        })
      },
    },
    fileTypes: {
      type: 'fileTypes',
      edit: ({ file_types }) => {
        // language=HTML
        return `
            <label>${ _x('Restrict file types', 'groundhogg') }</label>
            <div class="setting">
                ${ select({
                    name: 'file-types',
                    id: 'file-types',
                    multiple: true,
                }) }
            </div>`
      },
      onMount: ({ file_types = [] }, updateField) => {

        let fileTypes = [
          'jpeg',
          'jpg',
          'png',
          'pdf',
          'gif',
          'doc',
          'docx',
          'csv',
          'xlsx',
          'txt',
          'zip',
        ]

        $('#file-types').select2({
          tags: true,
          data: [
            ...file_types.map(ft => ( { id: ft, text: ft, selected: true } )),
            ...fileTypes.filter(t => !file_types.includes(t)),
          ],
        }).on('change', (e) => {
          updateField({
            file_types: $(e.target).val(),
          })
        })
      },
    },
    options: {
      type: 'options',
      edit ({ options = [''] }) {

        const selectOption = (option, i) => {
          // language=HTML
          return `
              <div class="select-option-wrap">
                  ${ input({
                      id: `select-option-${ i }`,
                      className: 'select-option',
                      value: option,
                      dataKey: i,
                  }) }
                  <button class="dashicon-button remove-option" data-key="${ i }"><span
                          class="dashicons dashicons-no-alt"></span></button>
              </div>`
        }

        // language=HTML
        return `
            <div class="options full-width">
                <label>${ _x('Options', 'label for dropdown options', 'groundhogg') }</label>
                <div class="select-options"></div>
            </div>`
      },
      async onMount ({ options = [['', '']] }, updateField, currentField) {

        let allTags = options.map(opt => opt[1]).reduce((carry, current) => [...carry, ...current.split(',')], [])

        if ( allTags.length ){
          await TagsStore.maybeFetchItems( allTags )
        }

        inputRepeater('.select-options', {
          rows: options,
          sortable: true,
          cells: [
            (props) => input({
              placeholder: _x('Value...', 'input placeholder', 'groundhogg'),
              ...props,
            }),
            ({ value, ...props }) => {

              let tagCount = value.split(',').length

              // language=HTML
              return `
                  <div class="inline-tag-picker" style="position: relative">
                      ${ icons.tag }
                      ${ value.length ? `<span class="number-of">${tagCount}</span><div class="gh-tooltip top">${sprintf( _n( 'Apply %d tag', 'Apply %d tags', tagCount, 'groundhogg' ), tagCount ) }</div>` : '' }
                      ${ input({
                          className: 'input hidden tags-input',
                          value: isString(value) ? value : '',
                          ...props,
                      }) }
                  </div>`
            },
          ],
          onMount: () => {

            let modal = false

            const openModal = (el) => {

              if (modal) {
                modal.close()
              }

              modal = miniModal(el, {
                content: `<div id="option-tags"></div>`,
                onOpen: () => {

                  let $input = $($(el).find('input'))
                  let selected = $input.val().split(',').map(t => parseInt(t)).filter(id => TagsStore.has(id))

                  morphdom( document.getElementById( 'option-tags' ), Groundhogg.components.TagPicker({
                    id: 'option-tags',
                    tagIds: selected,
                    onChange: tags => {
                      let tagIds = tags.map(id => parseInt(id))
                      $input.val(tagIds.join(',')).trigger('change')
                    }
                  }))
                },
                closeOnFocusout: false,
              })

            }

            $('.inline-tag-picker').on('click', e => {
              let el = e.currentTarget
              openModal(el)
            })
          },
          onChange: (rows) => {
            updateField({
              options: rows,
            })
          },
        }).mount()
      },
    },
  }

  /**
   * Render a preview of the field
   *
   * @param field
   * @returns {*}
   */
  const previewField = (field) => {
    return getFieldType(field.type).preview(field)
  }

  /**
   *
   * @param type
   * @returns {(*&{advanced(*): [], contentOnMount(*), advancedOnMount(*), name: string, content(*): []})|boolean}
   */
  const getFieldType = (type) => {
    if (!FieldTypes.hasOwnProperty(type)) {
      return false
    }

    return {
      ...FieldTypes.default,
      ...FieldTypes[type],
    }
  }

  const getFieldTypeOptions = () => {

    const options = []

    for (let group in fieldGroups) {

      let optgroup = []

      for (const type in FieldTypes) {

        if (FieldTypes.hasOwnProperty(type) && FieldTypes[type].hasOwnProperty('name') &&
          !FieldTypes[type].hasOwnProperty('hide') && FieldTypes[type].group === group) {

          optgroup.push({
            value: type,
            text: FieldTypes[type].name,
            group: fieldGroups[FieldTypes[type].group],
          })
        }
      }

      options.push(`<optgroup>${ optgroup.join('') }</optgroup>`)
    }

    return options
  }

  const standardContentSettings = [
    Settings.type.type,
    Settings.label.type,
    Settings.placeholder.type,
    Settings.hideLabel.type,
    Settings.required.type,
    Settings.columnWidth.type,
  ]

  const standardMetaContentSettings = [
    Settings.type.type,
    Settings.label.type,
    Settings.name.type,
    Settings.placeholder.type,
    Settings.hideLabel.type,
    Settings.required.type,
    Settings.columnWidth.type,
  ]

  const standardAdvancedSettings = [
    Settings.value.type,
    Settings.id.type,
    Settings.className.type,
  ]

  const standardAdvancedSettingsWithRedact = [
    ...standardAdvancedSettings,
    Settings.redact.type,
  ]

  const fieldPreview = ({
    type = 'text',
    id = uuid(),
    name = 'name',
    placeholder = '',
    value = '',
    label = '',
    hide_label = false,
    required = false,
    className = '',
  }) => {

    const inputField = input({
      id: id,
      type: type,
      name: name,
      placeholder: placeholder,
      value: value,
      className: `gh-input ${ className }`,
    })

    if (hide_label) {
      return inputField
    }

    if (required) {
      label += ' <span class="required">*</span>'
    }

    return `<label class="gh-input-label" for="${ id }">${ label }</label><div class="gh-form-field-input">${ inputField }</div>`
  }

  const FieldTypes = {
    default: {
      name: 'default',
      content: [],
      advanced: [],
      hide: true,
      preview: (field) => fieldPreview({
        ...field,
        type: 'text',
      }),
    },
    recaptcha: {
      name: 'reCAPTCHA',
      hide: true,
      content: [
        Settings.enabled.type,
        ...Groundhogg.recaptcha.version === 'v2' ? [
          Settings.captchaSize.type,
          Settings.captchaTheme.type,
          Settings.columnWidth.type,
        ] : [],
      ],
      advanced: [
        Settings.id.type,
        Settings.className.type,
      ],
      preview ({ id = '', className = '' }) {
        return `<div id="${ id }" class="${ className }"><div id="recaptcha-here" class="gh-panel outlined" style="width: fit-content"><div class="inside">${ __(
          'reCAPTCHA: <i>Only displayed on the front-end.</i>', 'groundhogg') }</div></div></div>`
      },
    },
    button: {
      name: 'Button',
      hide: true,
      content: [
        Settings.text.type,
        Settings.columnWidth.type,
      ],
      advanced: [
        Settings.id.type,
        Settings.className.type,
      ],
      preview ({ text = 'Submit', id = '', className = '' }) {
        return `<button id="${ id }" class="gh-button primary ${ className } full-width">${ text }</button>`
      },
    },
    first: {
      group: 'contact',
      name: 'First Name',
      content: standardContentSettings,
      advanced: standardAdvancedSettings,
      preview: (field) => fieldPreview({
        ...field,
        name: 'first_name',
        type: 'text',
      }),
    },
    last: {
      group: 'contact',
      name: 'Last Name',
      content: standardContentSettings,
      advanced: standardAdvancedSettings,
      preview: (field) => fieldPreview({
        ...field,
        name: 'last_name',
        type: 'text',
      }),
    },
    email: {
      group: 'contact',
      name: 'Email',
      content: standardContentSettings,
      advanced: standardAdvancedSettings,
      preview: (field) => fieldPreview({
        ...field,
        type: 'email',
        name: 'email',
      }),
    },
    phone: {
      group: 'contact',
      name: 'Phone Number',
      content: [
        Settings.type.type,
        Settings.label.type,
        Settings.phoneType.type,
        Settings.placeholder.type,
        Settings.hideLabel.type,
        Settings.required.type,
        Settings.columnWidth.type,
      ],
      advanced: standardAdvancedSettings,
      preview: ({ phone_type = 'primary', ...field }) => fieldPreview({
        ...field,
        type: 'tel',
        name: phone_type + '_phone',
      }),
    },
    line1: {
      group: 'address',
      name: __('Line 1', 'groundhogg'),
      content: standardContentSettings,
      advanced: standardAdvancedSettings,
      preview: (field) => fieldPreview({
        ...field,
        name: 'line1',
        type: 'text',
      }),
    },
    line2: {
      group: 'address',
      name: __('Line 2', 'groundhogg'),
      content: standardContentSettings,
      advanced: standardAdvancedSettings,
      preview: (field) => fieldPreview({
        ...field,
        name: 'line2',
        type: 'text',
      }),
    },
    city: {
      group: 'address',
      name: __('City', 'groundhogg'),
      content: standardContentSettings,
      advanced: standardAdvancedSettings,
      preview: (field) => fieldPreview({
        ...field,
        name: 'city',
        type: 'text',
      }),
    },
    state: {
      group: 'address',
      name: __('State', 'groundhogg'),
      content: standardContentSettings,
      advanced: standardAdvancedSettings,
      preview: (field) => fieldPreview({
        ...field,
        name: 'state',
        type: 'text',
      }),
    },
    zip_code: {
      group: 'address',
      name: __('Zip Code', 'groundhogg'),
      content: standardContentSettings,
      advanced: standardAdvancedSettings,
      preview: (field) => fieldPreview({
        ...field,
        name: 'zip_code',
        type: 'text',
      }),
    },
    country: {
      group: 'address',
      name: __('Country', 'groundhogg'),
      content: standardContentSettings,
      advanced: standardAdvancedSettings,
      preview: (field) => fieldPreview({
        ...field,
        name: 'country',
        type: 'text',
      }),
    },
    gdpr: {
      group: 'compliance',
      name: __('GDPR Consent', 'groundhogg'),
      content: [
        Settings.type.type,
        Settings.label.type,
        Settings.columnWidth.type,
      ],
      advanced: [
        Settings.id.type,
        Settings.className.type,
      ],
      preview: ({
        className = '',
        checked = false,
      }) => {

        const dataField = input({
          id: 'data-processing-consent',
          type: 'checkbox',
          className: `gh-checkbox-input ${ className }`,
          name: 'data_processing_consent',
          // required: true,
          value: 'yes',
          checked,
        })

        let dataLabel = sprintf(__('I agree to %s\'s storage and processing of my personal data.', 'groundhogg'),
          Groundhogg.name)

        const marketingField = input({
          id: 'marketing-consent',
          type: 'checkbox',
          className: `gh-checkbox-input ${ className }`,
          name: 'marketing_consent',
          // required: true,
          value: 'yes',
          checked,
        })

        let marketingLabel = sprintf(__('I agree to receive marketing offers and updates from %s.', 'groundhogg'),
          Groundhogg.name)

        //language=HTML
        return `
            <div><label class="gh-input-label">${ dataField } ${ dataLabel } <span class="required">*</span></label>
            </div>
            <div><label class="gh-input-label">${ marketingField } ${ marketingLabel }</label></div>
        `
      },
    },
    terms: {
      group: 'compliance',
      name: __('Terms & Conditions', 'groundhogg'),
      content: [
        Settings.type.type,
        Settings.columnWidth.type,
      ],
      advanced: [
        Settings.className.type,
      ],
      preview: ({
        className = '',
        checked = false,
      }) => {

        const field = input({
          id: 'groundhogg-terms',
          type: 'checkbox',
          className: `gh-checkbox-input ${ className }`,
          name: 'groundhogg_terms',
          required: true,
          value: 'yes',
          checked,
        })

        let label = __('I agree to the terms & conditions.', 'groundhogg')

        //language=HTML
        return `<label class="gh-input-label">${ field } ${ label } <span class="required">*</span></label>`
      },
    },
    hidden: {
      group: 'custom',
      name: 'Hidden',
      content: [
        Settings.type.type,
        // Settings.label.type,
        Settings.name.type,
        // Settings.placeholder.type,
        // Settings.hideLabel.type,
        // Settings.required.type,
        // Settings.columnWidth.type,
      ],
      advanced: standardAdvancedSettingsWithRedact,
      preview: (field) => fieldPreview({
        ...field,
        type: 'hidden',
        hide_label: true,
        required: false,
      }),
    },
    text: {
      group: 'custom',
      name: 'Text',
      content: standardMetaContentSettings,
      advanced: standardAdvancedSettingsWithRedact,
      preview: (field) => fieldPreview(field),
    },
    url: {
      group: 'custom',
      name: 'URL',
      content: standardMetaContentSettings,
      advanced: standardAdvancedSettingsWithRedact,
      preview: (field) => fieldPreview({
        ...field,
        type: 'url',
      }),
    },
    custom_email: {
      group: 'custom',
      name: 'Email',
      content: standardMetaContentSettings,
      advanced: standardAdvancedSettings,
      preview: (field) => fieldPreview({
        ...field,
        type: 'email',
      }),
    },
    tel: {
      group: 'custom',
      name: 'Phone Number',
      content: standardMetaContentSettings,
      advanced: standardAdvancedSettings,
      preview: (field) => fieldPreview({
        ...field,
        type: 'tel',
      }),
    },
    textarea: {
      group: 'custom',
      name: 'Textarea',
      content: standardMetaContentSettings,
      advanced: standardAdvancedSettingsWithRedact,
      preview: ({
        type = 'text',
        id = uuid(),
        name = 'name',
        placeholder = '',
        value = '',
        label = '',
        hide_label = false,
        required = false,
        className = '',
      }) => {

        const inputField = textarea({
          id: id,
          type: type,
          name: name,
          placeholder: placeholder,
          value: value,
          className: `gh-input ${ className }`,
        })

        if (hide_label) {
          return inputField
        }

        if (required) {
          label += ' <span class="required">*</span>'
        }

        return `<label class="gh-input-label" for="${ id }">${ label }</label><div class="gh-form-field-input">${ inputField }</div>`
      },
    },
    number: {
      group: 'custom',
      name: 'Number',
      content: standardMetaContentSettings,
      advanced: standardAdvancedSettingsWithRedact,
      preview: (field) => fieldPreview({
        ...field,
        type: 'number',
      }),
    },
    dropdown: {
      group: 'custom',
      name: 'Dropdown',
      content: [
        Settings.type.type,
        Settings.label.type,
        Settings.name.type,
        Settings.placeholder.type,
        Settings.hideLabel.type,
        Settings.required.type,
        Settings.options.type,
        Settings.multiple.type,
        Settings.columnWidth.type,
      ],
      advanced: [
        Settings.value.type,
        Settings.id.type,
        Settings.className.type,
      ],
      preview: ({
        id = uuid(),
        name = 'name',
        options = [],
        placeholder = '',
        label = '',
        hide_label = false,
        required = false,
        className = '',
        multiple = false,
        value = ''
      }) => {

        options = options.map(opt => ( {
          text: Array.isArray(opt) ? opt[0] : opt,
          value: Array.isArray(opt) ? opt[0] : opt,
        } ))

        if (placeholder) {
          options.unshift({
            text: placeholder,
            value: '',
          })
        }

        let props = {
          id: id,
          name: name,
          multiple,
          className: `gh-input ${ className }`,
          selected: multiple ? value.split(',').map( v => v.trim() ) : value
        }

        if (multiple) {
          props.multiple = true
        }

        const inputField = select(props, options)

        if (hide_label) {
          return inputField
        }

        if (required) {
          label += ' <span class="required">*</span>'
        }

        return `<label class="gh-input-label" for="${ id }">${ label }</label><div class="gh-form-field-input">${ inputField }</div>`
      },
    },
    radio: {
      group: 'custom',
      name: 'Radio',
      content: [
        Settings.type.type,
        Settings.label.type,
        Settings.name.type,
        // Settings.hideLabel.type,
        Settings.required.type,
        Settings.options.type,
        Settings.columnWidth.type,
      ],
      advanced: [
        Settings.value.type,
        Settings.id.type,
        Settings.className.type,
      ],
      preview: ({
        id = uuid(),
        name = 'name',
        options = [],
        label = '',
        // hide_label = false,
        required = false,
        className = '',
      }) => {

        const inputField = options.map((opt, i) => {
          // language=HTML
          return `
              <div class="gh-radio-wrapper">
                  <label class="gh-radio-label">
                      ${ input({
                          type: 'radio',
                          id: `${ id }-${ i }`,
                          className,
                          name,
                          value: Array.isArray(opt) ? opt[0] : opt,
                      }) } ${ Array.isArray(opt) ? opt[0] : opt }
                  </label>
              </div>`
        }).join('')

        if (required) {
          label += ' <span class="required">*</span>'
        }

        return `<label class="gh-input-label" for="${ id }">${ label }</label><div class="gh-form-field-input" id="${ id }">${ inputField }</div>`
      },
    },
    checkboxes: {
      group: 'custom',
      name: __('Checkbox List'),
      content: [
        Settings.type.type,
        Settings.label.type,
        Settings.name.type,
        // Settings.hideLabel.type,
        Settings.required.type,
        Settings.options.type,
        Settings.columnWidth.type,
      ],
      advanced: [
        Settings.value.type,
        Settings.id.type,
        Settings.className.type,
      ],
      preview: ({
        id = uuid(),
        name = 'name',
        options = [],
        label = '',
        required = false,
        className = '',
      }) => {

        const inputField = options.map(opt => {
          // language=HTML
          return `
              <div class="gh-radio-wrapper">
                  <label class="gh-radio-label">
                      ${ input({
                          type: 'checkbox',
                          id,
                          // required,
                          className,
                          name: name + '[]',
                          value: Array.isArray(opt) ? opt[0] : opt,
                      }) } ${ Array.isArray(opt) ? opt[0] : opt }
                  </label>
              </div>`
        }).join('')

        if (required) {
          label += ' <span class="required">*</span>'
        }

        return `<label class="gh-input-label" for="${ id }">${ label }</label><div class="gh-form-field-input">${ inputField }</div>`
      },
    },
    checkbox: {
      group: 'custom',
      name: __('Checkbox', 'groundhogg'),
      content: [
        Settings.type.type,
        Settings.label.type,
        Settings.name.type,
        Settings.tags.type,
        Settings.required.type,
        Settings.checked.type,
        Settings.columnWidth.type,
      ],
      advanced: standardAdvancedSettings,
      preview: ({
        id = uuid(),
        name = 'name',
        value = '1',
        label = '',
        required = false,
        className = '',
        checked = false,
      }) => {

        if (!value) {
          value = '1'
        }

        const inputField = input({
          id: id,
          type: 'checkbox',
          className: `gh-checkbox-input ${ className }`,
          name,
          value,
          checked,
        })

        if (required) {
          label += ' <span class="required">*</span>'
        }

        return `<label class="gh-input-label">${ inputField } ${ label }</label>`
      },
    },
    birthday: {
      group: 'contact',
      name: _x('Birthday', 'form field', 'groundhogg'),
      content: [
        Settings.type.type,
        Settings.label.type,
        Settings.hideLabel.type,
        Settings.required.type,
        Settings.columnWidth.type,
      ],
      advanced: standardAdvancedSettings,
      preview: ({
        id = uuid(),
        label = '',
        hide_label = false,
        required = false,
        className = '',
      }) => {

        function getLocalMonthNames () {
          let d = new Date(2000, 0) // January
          let months = []
          for (let i = 0; i < 12; i++) {
            months.push(d.toLocaleString('default', { month: 'long' }))
            d.setMonth(i + 1)
          }
          return months
        }

        const year = new Date().getFullYear()

        let inputField = [
          select({
            id: `${ id }-day`,
            name: 'birthday[day]',
            className: `gh-input ${ className }`,
            required,
          }, Array.from({ length: 31 }, (_, i) => i + 1)),
          select({
            id: `${ id }-month`,
            name: 'birthday[month]',
            className: `gh-input ${ className }`,
            required,
          }, getLocalMonthNames().map((m, i) => ( { value: i, text: m } ))),
          select({
            id: `${ id }-year`,
            name: 'birthday[year]',
            className: `gh-input ${ className }`,
            required,
          }, Array.from({ length: 100 }, (_, i) => year - i)),
        ]

        inputField = `<div class="gh-input-group">${ inputField.join('') }</div>`

        if (hide_label) {
          return inputField
        }

        if (required) {
          label += ' <span class="required">*</span>'
        }

        return `<label class="gh-input-label" for="${ id }">${ label }</label><div class="gh-form-field-input">${ inputField }</div>`
      },

    },
    date: {
      group: 'custom',
      name: _x('Date', 'form field', 'groundhogg'),
      content: [
        Settings.type.type,
        Settings.label.type,
        Settings.name.type,
        Settings.hideLabel.type,
        Settings.required.type,
        Settings.columnWidth.type,
      ],
      advanced: standardAdvancedSettingsWithRedact,
      preview: (field) => fieldPreview({
        ...field,
        type: 'date',
      }),
    },
    datetime: {
      group: 'custom',
      name: _x('Date & Time', 'form field', 'groundhogg'),
      content: [
        Settings.type.type,
        Settings.label.type,
        Settings.name.type,
        Settings.hideLabel.type,
        Settings.required.type,
        Settings.columnWidth.type,
      ],
      advanced: standardAdvancedSettingsWithRedact,
      preview: (field) => fieldPreview({
        ...field,
        type: 'datetime-local',
      }),
    },
    time: {
      group: 'custom',
      name: _x('Time', 'form field', 'groundhogg'),
      content: [
        Settings.type.type,
        Settings.label.type,
        Settings.name.type,
        Settings.hideLabel.type,
        Settings.required.type,
        Settings.columnWidth.type,
      ],
      advanced: standardAdvancedSettingsWithRedact,
      preview: (field) => fieldPreview({
        ...field,
        type: 'time',
      }),
    },
    file: {
      group: 'custom',
      name: _x('File', 'form field', 'groundhogg'),
      content: [
        Settings.type.type,
        Settings.label.type,
        Settings.name.type,
        Settings.required.type,
        Settings.hideLabel.type,
        Settings.fileTypes.type,
        Settings.columnWidth.type,
      ],
      advanced: [
        Settings.id.type,
        Settings.className.type,
      ],
      preview: (field) => fieldPreview({
        ...field,
        type: 'file',
      }),
    },
    custom_field: {
      group: 'contact',
      name: _x('Custom Field', 'form field', 'groundhogg'),
      content: [
        Settings.type.type,
        Settings.property.type,
        Settings.label.type,
        Settings.required.type,
        Settings.columnWidth.type,
      ],
      advanced: [
        Settings.value.type,
        Settings.id.type,
        Settings.className.type,
        Settings.redact.type
      ],
      preview: ({
        id = uuid(),
        property = false,
        value = '',
        label = '',
        required = false,
        className = '',
      }) => {

        property = getCustomProperties().find(f => f.id === property)

        if (!property) {
          return ''
        }

        property = copyObject(property)

        return FieldTypes[property.type].preview({
          ...property,
          value,
          required,
          className,
          id,
          label,
        })
      },
    },
    html: {
      group: 'custom',
      name: _x('HTML', 'form field', 'groundhogg'),
      content: [
        Settings.type.type,
        Settings.html.type,
        Settings.columnWidth.type,
      ],
      advanced: [
        Settings.id.type,
        Settings.className.type,
      ],
      preview: ({
        id = uuid(),
        html = '',
        className = '',
      }) => {
        return `<div id="${ id }" class="${ className }">${ html }</div>`
      },
    },
  }

  const Templates = {

    settings (field, settingsTab) {

      const fieldType = getFieldType(field.type)

      const settings = settingsTab === 'advanced' ? fieldType.advanced : fieldType.content

      // language=HTML
      return `
          <div class="settings-tabs">
              <a class="settings-tab ${ settingsTab === 'content' ? 'active' : '' }" data-tab="content">Content</a>
              <a class="settings-tab ${ settingsTab === 'advanced' ? 'active' : '' }" data-tab="advanced">Advanced</a>
          </div>
          <div class="settings">
              ${ settings.map(setting => `<div class="row">${ Settings[setting].edit(field) }</div>`).join('') }
          </div>`
    },

    field (key, field, isEditing, settingsTab, isSpecial = false) {

      const { type, label = '', text } = field
      const fieldType = getFieldType(type)

      let fieldName = label

      if (!fieldName || !fieldName.length) {
        fieldName = fieldType.name + ' Field'
      }

      //language=HTML
      return `
          <div class="form-field ${isEditing ? 'active' : ''}" data-key="${ key }">
              <div class="field-header">
                  <div class="details">
                      <div class="field-label">${ fieldName }</div>
                      <div class="field-type">${ fieldType.name }</div>
                  </div>
                  <div class="actions">
                      ${ !isSpecial ? `
					  <!-- Duplicate/Delete -->
					  <button class="duplicate" data-key="${ key }"><span class="dashicons dashicons-admin-page"></span>
					  </button>
					  <button class="delete" data-key="${ key }"><span class="dashicons dashicons-no"></span></button>`
                              // language=html
                              : `<button class="open" data-key="${ key }"><span class="dashicons ${ isEditing
                                      ? 'dashicons-arrow-up'
                                      : 'dashicons-arrow-down' }"></span></button>` }
                  </div>
              </div>
              ${ isEditing ?
                      //language=HTML
                      Templates.settings(field, settingsTab) : '' }
          </div>`
    },

    builder (form, activeField, settingsTab) {

      //language=HTML
      return `
          <div class="form-builder-main">
              <div class="fields-editor">
                  <div class="form-fields">
                      ${ form.fields.map(
                              (field, index) => Templates.field(index, field, activeField === index, settingsTab)).
                              join('') }
                  </div>
                  <button class="add-field gh-button secondary">${ __('Add Field', 'groundhogg') }</button>
                  <div class="special-fields">
                      ${ Groundhogg.recaptcha.enabled ? this.field('recaptcha', form.recaptcha,
                              activeField === 'recaptcha', settingsTab, true) : '' }
                      ${ this.field('button', form.button, activeField === 'button', settingsTab, true) }
                  </div>
              </div>
              <div class="form-preview-wrap gh-panel">
                  <div class="gh-panel-header">
                      <h2>Preview...</h2>
                  </div>
                  <div class="inside">
                      <div class="form-preview">
                          ${ this.preview(form) }
                      </div>
                  </div>
              </div>
          </div>`
    },

    /**
     *
     * @param form
     * @returns {string}
     */
    preview (form) {

      let { button, recaptcha, fields } = form

      let tmpFields = [...fields].filter(({ type }) => !['hidden'].includes(type))

      // only show if enabled and is version 2
      if (recaptcha.enabled && Groundhogg.recaptcha.version === 'v2' && Groundhogg.recaptcha.enabled) {
        tmpFields.push(recaptcha)
      }

      tmpFields.push(button)

      const formHTML = tmpFields.map(field => {

        const { column_width } = field

        // language=HTML
        return `
            <div class="gh-form-column ${ columnClasses[column_width] }">
                ${ previewField(field) }
            </div>`

      }).join('')

      //language=HTML
      return `
          <div class="gh-form-fields">
              ${ formHTML }
          </div>
      `
    },

  }

  const FormBuilder = (
    selector,
    form,
    onChange = (form) => {
      console.log(form)
    }) => ( {

    form,
    el: $(selector),
    activeField: false,
    activeFieldTab: 'content',

    mount () {

      // form does not exist yet, adding new
      if (!this.form) {
        this.form = defaultForm
        onChange(this.form)
      }

      this.render()
      this.onMount()
    },

    onMount () {
      var self = this

      const render = () => {
        this.mount()
      }

      const renderPreview = () => {
        this.renderPreview()
      }

      const currentField = () => {

        switch (this.activeField) {
          case 'button':
            return this.form.button
          case 'recaptcha':
            return this.form.recaptcha
          default:
            return this.form.fields[this.activeField]
        }
      }

      const setActiveField = (id) => {

        self.activeField = id
        self.activeFieldTab = 'content'
        render()
      }

      const addField = () => {
        this.form.fields.push(defaultField)
        setActiveField(this.form.fields.length - 1)
        onChange(this.form)
      }

      const deleteField = (id) => {
        this.form.fields.splice(id, 1)

        if (this.activeField === id) {
          this.activeField = false
          self.activeFieldTab = 'content'
        }

        render()
        onChange(this.form)
      }

      const duplicateField = (id) => {

        const field = this.form.fields[id]

        this.form.fields.splice(id, 0, field)

        setActiveField(id + 1)
        onChange(this.form)
      }

      const updateField = (atts, reRenderSettings = false, reRenderPreview = true) => {

        switch (this.activeField) {
          case 'button' :
            this.form.button = {
              ...this.form.button,
              ...atts,
            }
            break
          case 'recaptcha' :
            this.form.recaptcha = {
              ...this.form.recaptcha,
              ...atts,
            }
            break
          default:
            this.form.fields[this.activeField] = {
              ...this.form.fields[this.activeField],
              ...atts,
            }
            break
        }

        if (reRenderSettings) {

          render()
        }
        else if (reRenderPreview) {
          renderPreview()
        }

        onChange(this.form)
      }

      const $builder = $('.form-builder-main')

      $builder.on('click', '.add-field', addField)

      $builder.on('click', '.form-field', (e) => {

        const $field = $(e.currentTarget)
        const $target = $(e.target)

        let fieldKey = $field.data('key')

        if (fieldKey !== 'button' && fieldKey !== 'recaptcha') {
          fieldKey = parseInt(fieldKey)
        }

        if ($target.is('button.delete, button.delete .dashicons')) {
          deleteField(fieldKey)
        }
        else if ($target.is('button.duplicate, button.duplicate .dashicons')) {
          duplicateField(fieldKey)
        }
        else {
          if (fieldKey !== self.activeField) {
            setActiveField(fieldKey)
          }
          else if (e.target.classList.contains('settings-tab')) {
            self.activeFieldTab = e.target.dataset.tab
            render()
          }
        }
      })

      if (self.activeField !== false) {
        if (self.activeFieldTab === 'content') {
          getFieldType(currentField().type).content.forEach(setting => {
            Settings[setting].onMount(currentField(), updateField, currentField)
          })
        }
        else {
          getFieldType(currentField().type).advanced.forEach(setting => {
            Settings[setting].onMount(currentField(), updateField, currentField)
          })
        }
      }

      $builder.find('.form-fields').sortable({
        placeholder: 'field-placeholder',
        handle: '.field-header',
        start: function (e, ui) {
          ui.placeholder.height(ui.item.height())
          ui.placeholder.width(ui.item.width())
        },
        update: (e, ui) => {

          const newFields = []

          $builder.find('.form-fields .form-field').each(function (i) {
            const fieldId = parseInt($(this).data('key'))
            newFields.push(self.form.fields[fieldId])
          })

          this.form.fields = newFields

          console.log(ui)

          if ( ui.item.hasClass('active')){
            this.activeField = ui.item.index()
          }

          render()
          onChange(this.form)
        },
      })
    },

    renderPreview () {
      this.el.find('.form-preview').html(Templates.preview(this.form))
    },

    render () {
      this.el.html(Templates.builder(this.form, this.activeField, this.activeFieldTab))
    },

  } )

  Groundhogg.FormBuilder = FormBuilder
  Groundhogg.defaultForm = defaultForm

} )(jQuery)
