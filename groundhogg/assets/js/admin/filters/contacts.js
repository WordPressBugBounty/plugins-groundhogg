( function ($) {

  const {
    input,
    select,
    orList,
    andList,
    bold,
    inputRepeater,
  } = Groundhogg.element

  const {
    broadcastPicker,
    funnelPicker,
    tagPicker,
    emailPicker,
    linkPicker,
    metaValuePicker,
    metaPicker,
    userMetaPicker,
  } = Groundhogg.pickers

  const {
    assoc2array,
  } = Groundhogg.functions

  const {
    broadcasts: BroadcastsStore,
    emails    : EmailsStore,
    tags      : TagsStore,
    funnels   : FunnelsStore,
    searches  : SearchesStore,
  } = Groundhogg.stores

  const {
    sprintf,
    __,
    _x,
    _n,
  } = wp.i18n

  const {
    formatDate,
    formatDateTime,
    formatTime,
  } = Groundhogg.formatting

  const {
    Fragment,
    ItemPicker,
    Select,
    Input,
    Div,
    makeEl,
    InputRepeater
  } = MakeEl

  const {
    Filters,
    FilterRegistry,
    createFilter,
    createGroup,
    FilterDisplay,
    createDateFilter,
    createPastDateFilter,
    createStringFilter,
    createNumberFilter,
    createTimeFilter,
    unsubReasons,
  } = Groundhogg.filters

  const {
    ComparisonsTitleGenerators,
    AllComparisons,
    StringComparisons,
    NumericComparisons,
    pastDateRanges,
    futureDateRanges,
    allDateRanges,
  } = Groundhogg.filters.comparisons

  const ContactFilterRegistry = FilterRegistry({})

  const uid = function () {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  const createFilters = (el = '', filters = [], onChange = (f) => {
    console.log(f)
  }) => ( {
    el,
    onChange,
    filters: Array.isArray(filters) ? filters : [],
    id     : uid(),

    init () {
      this.mount()
    },

    mount () {

      let container = document.querySelector(el)
      // Clear existing content
      container.innerHTML = ''

      // Add the filters
      document.querySelector(el).appendChild(ContactFilters(this.id, this.filters, this.onChange))
    },
  } )

  const ContactFilters = (id, filters, onChange) => Filters({
    id,
    filterRegistry: ContactFilterRegistry,
    filters,
    onChange,
  })

  const ContactFilterDisplay = (filters) => FilterDisplay({
    filters,
    filterRegistry: ContactFilterRegistry,
  })

  const registerFilterGroup = (group, name) => {
    ContactFilterRegistry.registerGroup(createGroup(group, name))
  }

  /**
   * Register a new filter (legacy)
   *
   * @param type
   * @param group
   * @param opts
   * @param name
   * @deprecated
   */
  const registerFilter = (type, group = 'general', name = '', opts = {}) => {

    if (typeof name === 'object') {
      let tempOpts = name
      name = tempOpts.name
      opts = tempOpts
    }

    const {
      defaults = {},
      preload = () => {
      },
      view = () => '',
      edit = () => '',
      onMount = () => '',
    } = opts

    ContactFilterRegistry.registerFilter(createFilter(type, name, group, {
      display: view,
      preload,
      edit   : ({
        updateFilter,
        ...filter
      }) => Fragment([edit(filter)], {
        onCreate: el => {
          // Do the onmount
          setTimeout(() => {
            onMount(filter, updateFilter)
          }, 50)
        },
      }),
    }, defaults))
  }

  const standardActivityDateFilterOnMount = (filter, updateFilter) => {
    $('#filter-date-range, #filter-before, #filter-after, #filter-days').
      on('change', function (e) {
        const $el = $(this)
        updateFilter({
          [$el.prop('name')]: $el.val(),
        })

        if ($el.prop('name') === 'date_range') {

          const $before = $('#filter-before')
          const $after = $('#filter-after')
          const $days = $('#filter-days')

          $before.addClass('hidden')
          $after.addClass('hidden')
          $days.addClass('hidden')

          switch ($el.val()) {
            case 'between':
              $before.removeClass('hidden')
              $after.removeClass('hidden')
              break
            case 'day_of':
            case 'after':
              $after.removeClass('hidden')
              break
            case 'before':
              $before.removeClass('hidden')
              break
            case 'x_days':
              $days.removeClass('hidden')
              break
          }
        }
      })
  }

  const standardActivityDateTitle = (
    prepend, {
      date_range,
      before,
      after,
      days = 0,
      future = false,
    }) => {

    let ranges = future ? futureDateRanges : pastDateRanges

    switch (date_range) {
      default:
        return `${ prepend } ${ ranges[date_range]
                                ? ranges[date_range].replace('X', days).toLowerCase()
                                : '' }`
      case 'between':
        return `${ prepend } ${ sprintf(
          _x('between %1$s and %2$s', 'where %1 and %2 are dates',
            'groundhogg'), `<b>${ formatDate(after) }</b>`,
          `<b>${ formatDate(before) }</b>`) }`
      case 'before':
        return `${ prepend } ${ sprintf(
          _x('before %s', '%s is a date', 'groundhogg'),
          `<b>${ formatDate(before) }</b>`) }`
      case 'after':
        return `${ prepend } ${ sprintf(
          _x('after %s', '%s is a date', 'groundhogg'),
          `<b>${ formatDate(after) }</b>`) }`
      case 'day_of':
        return `${ prepend } ${ sprintf(
          _x('on %s', '%s is a date', 'groundhogg'),
          `<b>${ formatDate(after) }</b>`) }`
    }
  }

  const standardActivityDateOptions = ({
    date_range = '24_hours',
    after = '',
    before = '',
    days = 0,
    future = false,
  }) => {

    return [
      select({
        id  : 'filter-date-range',
        name: 'date_range',
      }, future ? futureDateRanges : pastDateRanges, date_range),
      input({
        type     : 'date',
        value    : after.split(' ')[0],
        id       : 'filter-after',
        className: `date ${ [
                              'between',
                              'after',
                              'day_of',
                            ].includes(date_range)
                            ? ''
                            : 'hidden' }`,
        name     : 'after',
      }),
      input({
        type     : 'date',
        value    : before.split(' ')[0],
        id       : 'filter-before',
        className: `value ${ [
                               'between',
                               'before',
                             ].includes(date_range)
                             ? ''
                             : 'hidden' }`,
        name     : 'before',
      }),
      input({
        type     : 'number',
        value    : days,
        id       : 'filter-days',
        min: 0,
        className: `value ${ [
                               'x_days',
                               'next_x_days',
                             ].includes(date_range)
                             ? ''
                             : 'hidden' }`,
        name     : 'days',
      }),
    ].join('')
  }

  const standardActivityDateDefaults = {
    date_range: 'any',
    before    : '',
    after     : '',
    count     : 1,
    days      : 0,
  }

  const filterCountDefaults = {
    count        : 1,
    count_compare: 'greater_than_or_equal_to',
  }

  const activityFilterComparisons = {
    equals                  : _x('Exactly', 'comparison', 'groundhogg'),
    less_than               : _x('Less than', 'comparison', 'groundhogg'),
    greater_than            : _x('More than', 'comparison', 'groundhogg'),
    less_than_or_equal_to   : _x('At most', 'comparison', 'groundhogg'),
    greater_than_or_equal_to: _x('At least', 'comparison', 'groundhogg'),
  }

  const filterCount = ({
    count,
    count_compare,
  }) => {
    //language=HTML
    return `
        <div class="space-between" style="gap: 10px">
            <div class="gh-input-group">
                ${ select({
                    id  : 'filter-count-compare',
                    name: 'count_compare',
                }, activityFilterComparisons, count_compare) }
                ${ input({
                    type        : 'number',
                    id          : 'filter-count',
                    name        : 'count',
                    autocomplete: 'off',
                    value       : count,
                    placeholder : 1,
                    style       : {
                        width: '100px',
                    },
                    min:0,
                }) }
            </div>
            <span class="gh-text">
			  ${ __('Times') }
          </span>
        </div>`
  }

  const filterCountOnMount = (updateFilter) => {
    $('#filter-count,#filter-count-compare').on('change', (e) => {
      updateFilter({
        [e.target.name]: e.target.value,
      })
    })
  }

  const filterCountComparisons = {
    equals                  : (v) => sprintf(_n('%s time', '%s times', parseInt(v), 'groundhogg'),
      v),
    less_than               : (v) => sprintf(
      _n('less than %s time', 'less than %s times', parseInt(v), 'groundhogg'),
      v),
    less_than_or_equal_to   : (v) => sprintf(
      _n('at most %s time', 'at most %s times', parseInt(v), 'groundhogg'), v),
    greater_than            : (v) => sprintf(
      _n('more than %s time', 'more than %s times', parseInt(v), 'groundhogg'),
      v),
    greater_than_or_equal_to: (v) => sprintf(
      _n('at least %s time', 'at least %s times', parseInt(v), 'groundhogg'),
      v),
  }

  const filterCountTitle = (
    title, {
      count = 1,
      count_compare = 'equals',
    }) => {
    return title + ' ' + filterCountComparisons[count_compare](count)
  }

//  REGISTER ALL FILTERS HERE
  const BasicTextFilter = (name) => ( {
    name,
    view ({
      compare,
      value,
    }) {
      return ComparisonsTitleGenerators[compare](`<b>${ name }</b>`,
        `<b>"${ value }"</b>`)
    },
    edit ({
      compare,
      value,
    }) {
      // language=html
      return `${ select({
          id  : 'filter-compare',
          name: 'compare',
      }, StringComparisons, compare) } ${ input({
          id  : 'filter-value',
          name: 'value',
          value,
      }) }`
    },
    onMount (filter, updateFilter) {
      // console.log(filter)

      $('#filter-compare, #filter-value').on('change', function (e) {
        // console.log(e)
        const $el = $(this)
        updateFilter({
          [$el.prop('name')]: $el.val(),
        })
      })
    },
    defaults: {
      compare: 'equals',
      value  : '',
    },
  } )

  registerFilterGroup('contact',
    _x('Contact', 'noun referring to a person in the crm', 'groundhogg'))
  registerFilterGroup('location',
    _x('Contact Location', 'contact is a noun referring to a person',
      'groundhogg'))
  registerFilterGroup('user', __('User'))
  registerFilterGroup('activity',
    _x('Activity', 'noun referring to a persons past activities', 'groundhogg'))

  registerFilter('first_name', 'contact', {
    ...BasicTextFilter(__('First Name', 'groundhogg')),
  })

  registerFilter('last_name', 'contact', {
    ...BasicTextFilter(__('Last Name', 'groundhogg')),
  })

  registerFilter('email', 'contact', {
    ...BasicTextFilter(__('Email Address', 'groundhogg')),
  })

  const phoneTypes = {
    primary: __('Primary Phone', 'groundhogg'),
    mobile : __('Mobile Phone', 'groundhogg'),
    company: __('Company Phone', 'groundhogg'),
  }

  registerFilter('phone', 'contact', {
    name: __('Phone Number', 'groundhogg'),
    view ({
      phone_type = 'primary',
      compare,
      value,
    }) {
      return ComparisonsTitleGenerators[compare](
        `<b>${ phoneTypes[phone_type] }</b>`, `<b>"${ value }"</b>`)
    },
    edit ({
      phone_type,
      compare,
      value,
    }) {
      // language=html
      return `${ select({
          id  : 'filter-phone-type',
          name: 'phone_type',
      }, phoneTypes, phone_type) }
      ${ select({
          id  : 'filter-compare',
          name: 'compare',
      }, StringComparisons, compare) } ${ input({
          id  : 'filter-value',
          name: 'value',
          value,
      }) }`
    },
    onMount (filter, updateFilter) {
      // console.log(filter)

      $('#filter-phone-type, #filter-compare, #filter-value').
        on('change', function (e) {
          // console.log(e)
          const $el = $(this)
          updateFilter({
            [$el.prop('name')]: $el.val(),
          })
        })
    },
    defaults: {
      phone_type: 'primary',
      compare   : 'equals',
      value     : '',
    },
  })

  // registerFilter('primary_phone', 'contact', {}, 'Primary Phone')
  // registerFilter('mobile_phone', 'contact', {}, 'Mobile Phone')

  ContactFilterRegistry.registerFilter(createDateFilter('birthday', __('Birthday', 'groundhogg'), 'contact'))
  ContactFilterRegistry.registerFilter(createNumberFilter('age', __('Age', 'groundhogg'), 'contact'))
  ContactFilterRegistry.registerFilter(createPastDateFilter('date_created', __('Date Created', 'groundhogg'), 'contact'))

  const {
    optin_status,
    owners,
    countries,
    roles,
  } = Groundhogg.filters

  registerFilter('optin_status', 'contact', __('Opt-in Status', 'groundhogg'), {
    view ({
      compare,
      value,
    }) {
      const func = compare === 'in' ? orList : andList
      return ComparisonsTitleGenerators[compare](
        `<b>${ __('Opt-in Status', 'groundhogg') }</b>`,
        func(value.map(v => `<b>${ optin_status[v] }</b>`)))
    },
    edit ({
      compare,
      value,
    }) {

      // language=html
      return `
          ${ select({
              id   : 'filter-compare',
              name : 'compare',
              class: '',
          }, {
              in    : _x('Is one of', 'comparison, groundhogg'),
              not_in: _x('Is not one of', 'comparison', 'groundhogg'),
          }, compare) }
          ${ select({
              id      : 'filter-value',
              name    : 'value',
              class   : 'gh-select2',
              multiple: true,
          }, Object.keys(optin_status).
                  map(k => ( {
                      value: k,
                      text: optin_status[k],
                  } )), value) } `
    },
    onMount (filter, updateFilter) {
      $('#filter-value').select2()
      $('#filter-value, #filter-compare').on('change', function (e) {
        const $el = $(this)
        // console.log($el.val())
        updateFilter({
          [$el.prop('name')]: $el.val(),
        })
      })
    },
    defaults: {
      compare: 'in',
      value  : [],
    },
  })

  registerFilter('is_marketable', 'contact', __('Marketable', 'groundhogg'), {
    view ({ marketable }) {
      return marketable === 'yes' ? __('Is marketable', 'groundhogg') : __(
        'Is not marketable', 'groundhogg')
    },
    edit ({ marketable }) {

      // language=html
      return `
          ${ select({
              id  : 'filter-marketable',
              name: 'marketable',
          }, {
              yes: _x('Yes', 'comparison, groundhogg'),
              no : _x('No', 'comparison', 'groundhogg'),
          }, marketable) }`
    },
    onMount (filter, updateFilter) {
      $('#filter-marketable').on('change', function (e) {
        const $el = $(this)
        // console.log($el.val())
        updateFilter({
          [$el.prop('name')]: $el.val(),
        })
      })
    },
    defaults: {
      marketable: 'yes',
    },
  })

  const userDisplay = (user) => {
    return `${ user.data.display_name } (${ user.data.user_email })`
  }

  registerFilter('owner', 'contact', __('Owner', 'groundhogg'), {
    view ({
      compare,
      value = [],
    }) {

      if (!value.length) {
        throw new Error('At least 1 owner must be selected.')
      }

      const ownerName = (ID) => {
        let user = owners.find(owner => owner.ID == ID)

        if (!user) {
          throw new Error(`Owner with ID ${ ID } does not exist`)
        }

        return userDisplay(user)
      }

      const func = compare === 'in' ? orList : andList
      return ComparisonsTitleGenerators[compare](
        `<b>${ __('Contact Owner', 'groundhogg') }</b>`,
        func(value.map(v => `<b>${ ownerName(v) }</b>`)))

    },
    edit ({
      compare,
      value,
    }) {

      // language=html
      return `
          ${ select({
              id  : 'filter-compare',
              name: 'compare',
          }, {
              in    : _x('Is one of', 'comparison, groundhogg'),
              not_in: _x('Is not one of', 'comparison', 'groundhogg'),
          }, compare) }

          ${ select({
                      id: 'filter-value',
                      name: 'value',
                      multiple: true,
                  }, owners.map(u => ( {
                      value: u.ID,
                      text: userDisplay(u),
                  } )),
                  value.map(id => parseInt(id))) } `

    },
    onMount (filter, updateFilter) {
      $('#filter-value').select2()
      $('#filter-value, #filter-compare').on('change', function (e) {
        const $el = $(this)
        // console.log($el.val())
        updateFilter({
          [$el.prop('name')]: $el.val(),
        })
      })
    },
    defaults: {
      compare: 'in',
      value  : [], /*  value: '',
              value2: ''*/
    },
  })

  registerFilter('tags', 'contact',
    _x('Tags', 'noun referring to contact segments', 'groundhogg'), {
      view ({
        tags = [],
        compare,
        compare2,
      }) {

        if (!tags) {
          return 'tags'
        }

        tags = tags.map(t => {
          let tag = TagsStore.get(parseInt(t))

          if (!tag) {
            throw new Error(`Tag of ID ${ t } does not exist`)
          }

          return tag
        })

        const tagNames = tags.map(t => `<b>${ t.data.tag_name }</b>`)
        const func = compare2 === 'any' ? orList : andList

        return ComparisonsTitleGenerators[compare](
          `<b>${ _x('Tags', 'noun referring to contact segments',
            'groundhogg') }</b>`, func(tagNames))
      },
      edit ({
        tags,
        compare,
        compare2,
      }) {

        tags = tags.map(t => TagsStore.get(parseInt(t))).filter(Boolean)

        // language=html
        return `${ select({
            id: 'filter-compare',
            name: 'compare',
        }, {
            includes: _x('Includes', 'comparison', 'groundhogg'),
            excludes: _x('Excludes', 'comparison', 'groundhogg'),
        }, compare) }

        ${ select({
            id: 'filter-compare2',
            name: 'compare2',
        }, {
            any: __('Any', 'groundhogg'),
            all: __('All', 'groundhogg'),
        }, compare2) }

        ${ select({
            id       : 'filter-tags',
            name     : 'tags',
            className: 'tag-picker',
            multiple : true,
        }, tags.map(t => ( {
            value: t.ID,
            text: t.data.tag_name,
        } )), tags.map(t => t.ID)) }`
      },
      onMount (filter, updateFilter) {

        tagPicker('#filter-tags', true, (items) => {
          TagsStore.itemsFetched(items)
        }, {
          tags: false,
        }).on('change', (e) => {
          updateFilter({
            tags: $(e.target).val(),
          })
        })

        $('#filter-compare, #filter-compare2').on('change', function (e) {
          const $el = $(this)
          updateFilter({
            [$el.prop('name')]: $el.val(),
          })
        })
      },
      defaults: {
        compare: 'includes',
        compare2: 'any',
        tags: [],
      },
      preload : ({ tags }) => {

        if (!TagsStore.hasItems(tags)) {
          return TagsStore.fetchItems({
            tag_id: tags,
          })
        }
      },
    })

  registerFilter('meta', 'contact', __('Custom meta', 'groundhogg'), {
    view ({
      meta,
      compare,
      value,
    }) {
      return ComparisonsTitleGenerators[compare](`<b>${ meta }</b>`,
        `<b>"${ value }"</b>`)
    },
    edit ({
      meta,
      compare,
      value,
    }, filterGroupIndex, filterIndex) {

      // language=html
      return [
        input({
          id       : 'filter-meta',
          name     : 'meta',
          className: 'meta-picker',
          dataGroup: filterIndex,
          dataKey  : filterIndex,
          value    : meta,
        }),

        select({
          id       : 'filter-compare',
          name     : 'compare',
          dataGroup: filterIndex,
          dataKey  : filterIndex,
        }, AllComparisons, compare),

        [
          'empty',
          'not_empty',
        ].includes(compare) ? '' : input({
          id       : 'filter-value',
          name     : 'value',
          dataGroup: filterIndex,
          dataKey  : filterIndex,
          value,
        }),
      ].join('')

    },
    onMount (filter, updateFilter) {

      metaPicker('#filter-meta')

      $('#filter-compare, #filter-value, #filter-meta').
        on('change blur', function (e) {
          const $el = $(this)
          updateFilter({
            [$el.prop('name')]: $el.val(),
          }, true)
        })

    },
    defaults: {
      meta   : '',
      compare: 'equals',
      value  : '',
    },
  })

  registerFilter('contact_id', 'contact', __('Contact ID', 'groundhogg'), {
    view ({
      compare,
      value,
    }) {
      return ComparisonsTitleGenerators[compare](`<b>${ __('Contact ID') }</b>`,
        `<b>${ value }</b>`)
    },
    edit ({
      compare,
      value,
    }) {
      // language=html
      return `
          ${ select({
              id  : 'filter-compare',
              name: 'compare',
          }, NumericComparisons, compare) } ${ input({
              id  : 'filter-value',
              name: 'value',
              type: 'number',
              step: '0.01',
              value,
          }) }`
    },
    onMount (filter, updateFilter) {

      $('#filter-compare, #filter-value').on('change', function (e) {
        const $el = $(this)
        updateFilter({
          [$el.prop('name')]: $el.val(),
        })
      })
    },
    defaults: {
      compare: 'equals',
      value  : '',
    },
  })

  registerFilter('is_user', 'user', __('Has User Account', 'groundhogg'), {
    view () {
      return __('Has a user account', 'groundhogg')
    },
    edit () {
      // language=html
      return ''
    },
    onMount (filter, updateFilter) {
    },
    defaults: {},
  })

  registerFilter('user_role_is', 'user', __('User Role', 'groundhogg'), {
    view ({ role = 'subscriber' }) {
      return sprintf(__('User role is %s', 'groundhogg'),
        bold(role ? roles[role].name : ''))
    },
    edit ({ role }) {

      // language=html
      return `${ select({
          id: 'filter-role',
          name: 'role',
        }, Object.keys(roles).
          map(r => ( {
            text: roles[r].name,
            value: r,
          } )),
        role) }`
    },
    onMount (filter, updateFilter) {

      $('#filter-role').select2({
        placeholder: __('Select a role', 'groundhogg'),
      }).on('change', function (e) {
        const $el = $(this)
        updateFilter({
          role: $el.val(),
        })
      })
    },
    defaults: {
      role: 'subscriber',
    },
  })

  registerFilter('user_meta', 'user', __('User Meta', 'groundhogg'), {
    view ({
      meta,
      compare,
      value,
    }) {
      return ComparisonsTitleGenerators[compare](`<b>${ meta }</b>`,
        `<b>"${ value }"</b>`)
    },
    edit ({
      meta,
      compare,
      value,
    }, filterGroupIndex, filterIndex) {
      // language=html
      return `
          ${ input({
              id       : 'filter-meta',
              name     : 'meta',
              className: 'meta-picker',
              dataGroup: filterIndex,
              dataKey  : filterIndex,
              value    : meta,
          }) }
          ${ select({
              id       : 'filter-compare',
              name     : 'compare',
              dataGroup: filterIndex,
              dataKey  : filterIndex,
          }, AllComparisons, compare) } ${ input({
              id       : 'filter-value',
              name     : 'value',
              dataGroup: filterIndex,
              dataKey  : filterIndex,
              value,
          }) }`
    },
    onMount (filter, updateFilter) {

      userMetaPicker('#filter-meta')

      $('#filter-compare, #filter-value, #filter-meta').
        on('change blur', function (e) {
          const $el = $(this)
          const { compare } = updateFilter({
            [$el.prop('name')]: $el.val(),
          })
        })
    },
    defaults: {
      meta   : '',
      compare: 'equals',
      value  : '',
    },
  })

  registerFilter('user_id', 'user', __('User ID', 'groundhogg'), {
    view ({
      compare,
      value,
    }) {
      return ComparisonsTitleGenerators[compare](`<b>${ __('User ID') }</b>`,
        `<b>${ value }</b>`)
    },
    edit ({
      compare,
      value,
    }) {
      // language=html
      return `
          ${ select({
              id  : 'filter-compare',
              name: 'compare',
          }, NumericComparisons, compare) } ${ input({
              id  : 'filter-value',
              name: 'value',
              type: 'number',
              step: '0.01',
              value,
          }) }`
    },
    onMount (filter, updateFilter) {

      $('#filter-compare, #filter-value').on('change', function (e) {
        const $el = $(this)
        updateFilter({
          [$el.prop('name')]: $el.val(),
        })
      })
    },
    defaults: {
      compare: 'equals',
      value  : '',
    },
  })

  registerFilter('country', 'location', __('Country', 'groundhogg'), {
    view ({ country }) {
      return sprintf(__('Country is %s', 'groundhogg'),
        bold(countries[country]))
    },
    edit ({ country }) {
      // language=html
      return `
          ${ select({
              id  : 'filter-country',
              name: 'country',
          }, countries, country) }`
    },
    onMount (filter, updateFilter) {

      $('#filter-country').select2().on('change', function (e) {
        const $el = $(this)
        updateFilter({
          country: $el.val(),
        })
      })
    },
    defaults: {
      country: '',
    },
  })

  registerFilter('region', 'location', __('State/Province', 'groundhogg'), {
    view ({ region }) {
      return sprintf(__('State/Province is %s', 'groundhogg'), bold(region))
    },
    edit ({ region }) {
      // language=html
      return `
          ${ input({
              id          : 'filter-region',
              name        : 'region',
              value       : region,
              autocomplete: 'off',
              placeholder : __('Start typing to select a region', 'groundhogg'),
          }) }`
    },
    onMount (filter, updateFilter) {

      metaValuePicker('#filter-region', 'region').
        on('change blur', function (e) {
          updateFilter({
            region: $(e.target).val(),
          })
        })
    },
    defaults: {
      region: '',
    },
  })

  registerFilter('city', 'location', __('City', 'groundhogg'), {
    view ({ city }) {
      return sprintf(__('City is %s', 'groundhogg'), bold(city))
    },
    edit ({ city }) {
      // language=html
      return `
          ${ input({
              id          : 'filter-city',
              name        : 'city',
              value       : city,
              autocomplete: 'off',
              placeholder : __('Start typing to select a city', 'groundhogg'),
          }) }`
    },
    onMount (filter, updateFilter) {

      metaValuePicker('#filter-city', 'city').on('change blur', function (e) {
        updateFilter({
          city: $(e.target).val(),
        })
      })
    },
    defaults: {
      city: '',
    },
  })

  registerFilter('street_address_1', 'location',
    __('Line 1', 'groundhogg'), {
      ...BasicTextFilter(__('Street Address 1', 'groundhogg')),
    })

  registerFilter('street_address_2', 'location',
    __('Line 2', 'groundhogg'), {
      ...BasicTextFilter(__('Street Address 2', 'groundhogg')),
    })

  registerFilter('zip_code', 'location', __('Zip/Postal Code', 'groundhogg'), {
    ...BasicTextFilter(__('Zip/Postal Code', 'groundhogg')),
  })

  registerFilter('locale', 'location', __('Locale', 'groundhogg'), {
    view ({
      locales = [],
    }) {

      if ( ! locales.length ){
        throw new Error( 'Select a locale' )
      }

      let dropdown = Div({}, GroundhoggLocalDropdown ).firstElementChild

      locales = locales.map( locale => bold( dropdown.querySelector( `option[value="${locale}"]` ).innerHTML ) )

      return sprintf( '%s is %s', bold( __( 'Locale' ) ), orList( locales ) )
    },
    edit ({
      locales = [],
    }) {
      // language=html
      let dropdown = Div({}, GroundhoggLocalDropdown ).firstElementChild
      dropdown.multiple = true
      locales.forEach( locale => {
        dropdown.querySelector( `option[value="${locale}"]` ).selected = true
      } )
      return dropdown
    },
    onMount (filter, updateFilter) {
      // console.log(filter)

      $('#filter-locale').select2({
        multiple: true,
      }).on('change', function (e) {

        const $el = $(this)

        updateFilter({
          locales: $el.val(),
        })
      })
    },
    defaults: {
      locales: ['en_US'],
    },
  })

  //filter by Email Opened
  registerFilter('email_received', 'activity',
    __('Email Received', 'groundhogg'), {
      view ({
        email_id,
        ...rest
      }) {
        const emailName = email_id
                          ? EmailsStore.get(email_id).data.title
                          : 'any email'

        let prefix = sprintf(_x('Received %s', '%s is an email', 'groundhogg'),
          `<b>${ emailName }</b>`)
        prefix = filterCountTitle(prefix, rest)

        return standardActivityDateTitle(prefix, rest)
      },
      edit ({
        email_id,
        ...rest
      }) {

        const pickerOptions = email_id ? {
          [email_id]: EmailsStore.get(email_id).data.title,
        } : {}

        // language=html
        return `
            ${ select({
                id: 'filter-email',
                name: 'email_id',
            }, pickerOptions, email_id) }

            ${ filterCount(rest) }

            ${ standardActivityDateOptions(rest) }`
      },
      onMount (filter, updateFilter) {
        emailPicker('#filter-email', false, (items) => {
          EmailsStore.itemsFetched(items)
        }, {}, {
          placeholder: __('Please select an email or leave blank for any email',
            'groundhogg'),
        }).on('change', (e) => {
          updateFilter({
            email_id: parseInt(e.target.value),
          })
        })

        filterCountOnMount(updateFilter)

        standardActivityDateFilterOnMount(filter, updateFilter)
      },
      defaults: {
        ...standardActivityDateDefaults, ...filterCountDefaults,
        email_id: 0,
      },
      preload : ({ email_id }) => {
        if (email_id) {
          return EmailsStore.maybeFetchItem(email_id)
        }
      },
    })

  //filter by Email Opened
  registerFilter('email_opened', 'activity', __('Email Opened', 'groundhogg'), {
    view ({
      email_id,
      ...rest
    }) {
      const emailName = email_id
                        ? EmailsStore.get(email_id).data.title
                        : 'any email'

      let prefix = sprintf(_x('Opened %s', '%s is an email', 'groundhogg'),
        `<b>${ emailName }</b>`)

      prefix = filterCountTitle(prefix, rest)

      return standardActivityDateTitle(prefix, rest)
    },
    edit ({
      email_id,
      ...rest
    }) {

      const pickerOptions = email_id ? {
        [email_id]: EmailsStore.get(email_id).data.title,
      } : {}

      // language=html
      return `
          ${ select({
              id  : 'filter-email',
              name: 'email_id',
          }, pickerOptions, email_id) }

          ${ filterCount(rest) }

          ${ standardActivityDateOptions(rest) }`
    },
    onMount (filter, updateFilter) {
      emailPicker('#filter-email', false, (items) => {
        EmailsStore.itemsFetched(items)
      }, {}, {
        placeholder: __('Please select an email or leave blank for any email',
          'groundhogg'),
      }).on('change', (e) => {
        updateFilter({
          email_id: parseInt(e.target.value),
        })
      })

      filterCountOnMount(updateFilter)

      standardActivityDateFilterOnMount(filter, updateFilter)
    },
    defaults: {
      ...standardActivityDateDefaults, ...filterCountDefaults,
      email_id: 0,
    },
    preload : ({ email_id }) => {
      if (email_id) {
        return EmailsStore.maybeFetchItem(email_id)
      }
    },
  })

  //filter by Email Opened
  registerFilter('email_link_clicked', 'activity',
    __('Email Link Clicked', 'groundhogg'), {
      view ({
        email_id,
        link = '',
        ...rest
      }) {

        const emailName = email_id
                          ? EmailsStore.get(email_id).data.title
                          : 'any email'

        const maybeTruncateLink = (link) => {
          return link.length > 50 ? `${ link.substring(0, 47) }...` : link
        }

        let prepend = sprintf(
          link ? __('Clicked %1$s in %2$s', 'groundhogg') : __(
            'Clicked any link in %2$s', 'groundhogg'),
          `<b class="link" title="${ link }">${ maybeTruncateLink(link) }</b>`,
          `<b>${ emailName }</b>`)

        prepend = filterCountTitle(prepend, rest)

        return standardActivityDateTitle(prepend, rest)
      },
      edit ({
        email_id,
        link,
        ...rest
      }) {

        const pickerOptions = email_id ? {
          [email_id]: EmailsStore.get(email_id).data.title,
        } : {}

        // language=html
        return `
            ${ select({
                id: 'filter-email',
                name: 'email_id',
            }, pickerOptions, email_id) }

            ${ input({
                id          : 'filter-link',
                name        : 'link',
                autocomplete: 'off',
                value       : link,
                placeholder : __(
                        'Start typing to select a link or leave blank for any link',
                        'groundhogg'),
            }) }

            ${ filterCount(rest) }

            ${ standardActivityDateOptions(rest) }`
      },
      onMount (filter, updateFilter) {
        emailPicker('#filter-email', false, (items) => {
          EmailsStore.itemsFetched(items)
        }, {}, {
          placeholder: __('Please select an email or leave blank for any email',
            'groundhogg'),
        }).on('change', (e) => {
          updateFilter({
            email_id: parseInt(e.target.value),
          })
        })

        linkPicker('#filter-link').on('change input blur', ({ target }) => {
          updateFilter({
            link: target.value,
          })
        })

        filterCountOnMount(updateFilter)

        standardActivityDateFilterOnMount(filter, updateFilter)
      },
      defaults: {
        ...standardActivityDateDefaults, ...filterCountDefaults,
        link    : '',
        email_id: 0,
      },
      preload : ({ email_id }) => {
        if (email_id) {
          return EmailsStore.maybeFetchItem(email_id)
        }
      },
    })

  registerFilter('confirmed_email', 'activity',
    __('Confirmed Email Address', 'groundhogg'), {
      view (filter) {
        return standardActivityDateTitle(
          `<b>${ __('Confirmed Email Address', 'groundhogg') }</b>`, filter)
      },
      edit (filter) {
        return standardActivityDateOptions(filter)
      },
      onMount (filter, updateFilter) {
        standardActivityDateFilterOnMount(filter, updateFilter)
      },
      defaults: {
        ...standardActivityDateDefaults,
      },
    })

  ContactFilterRegistry.registerFilter(createPastDateFilter('unsubscribed', __('Unsubscribed', 'groundhogg'), 'activity', {
    edit   : ({
      reasons = [],
      updateFilter,
    }) => Fragment([
      ItemPicker({
        id          : 'unsub-reasons',
        placeholder : __('Search', 'groundhogg'),
        noneSelected: __('Any reason', 'groundhogg'),
        fetchOptions: async (s) => assoc2array(unsubReasons),
        selected    : reasons.map(reason => ( {
          id  : reason,
          text: unsubReasons[reason] ?? reason,
        } )),
        onChange    : items => {
          let reasons = items.map(({ id }) => id)
          console.log(reasons)
          updateFilter({
            reasons,
          })
        },
      }),
    ]),
    display: ({ reasons = [] }) => sprintf('Unsubscribed %s', orList(reasons.map(r => bold(unsubReasons[r] ?? r)))),
  }))

  // registerFilter('unsubscribed', 'activity', __('Unsubscribed', 'groundhogg'), {
  //   view (filter) {
  //     return standardActivityDateTitle(
  //       `<b>${ __('Unsubscribed', 'groundhogg') }</b>`, filter)
  //   }, edit (filter) {
  //     return standardActivityDateOptions(filter)
  //   }, onMount (filter, updateFilter) {
  //     standardActivityDateFilterOnMount(filter, updateFilter)
  //   }, defaults: {
  //     ...standardActivityDateDefaults,
  //   },
  // })

  registerFilter('optin_status_changed', 'activity',
    __('Opt-in Status Changed', 'groundhogg'), {
      view ({
        value,
        ...filter
      }) {
        return standardActivityDateTitle(
          sprintf('<b>Opt-in status</b> changed to %s',
            orList(value.map(v => `<b>${ optin_status[v] }</b>`))), filter)
      },
      edit ({
        value,
        ...filter
      }) {
        return [
          select({
            id      : 'filter-value',
            name    : 'value',
            class   : 'gh-select2',
            multiple: true,
          }, Object.keys(optin_status).
            map(k => ( {
              value: k,
              text: optin_status[k],
            } )), value),
          standardActivityDateOptions(filter),
        ].join('')
      },
      onMount (filter, updateFilter) {
        $('#filter-value').select2()
        $('#filter-value').on('change', function (e) {
          const $el = $(this)
          // console.log($el.val())
          updateFilter({
            [$el.prop('name')]: $el.val(),
          })
        })
        standardActivityDateFilterOnMount(filter, updateFilter)
      },
      defaults: {
        value: [], ...standardActivityDateDefaults,
      },
    })

  //filter by Email Opened
  registerFilter('page_visited', 'activity', __('Page Visited', 'groundhogg'), {
    view ({
      link,
      ...rest
    }) {

      let prefix

      if (link) {
        const url = new URL(link)

        prefix = sprintf(__('Visited %s', 'groundhogg'), bold(url.pathname))
      }
      else {
        prefix = __('Visited <b>any page</b>', 'groundhogg')
      }

      prefix = filterCountTitle(prefix, rest)

      return standardActivityDateTitle(prefix, rest)
    },
    edit ({
      link,
      ...rest
    }) {

      // language=html
      return `

          ${ input({
              id          : 'filter-link',
              name        : 'link',
              autocomplete: 'off',
              value       : link,
              placeholder : __(
                      'Start typing to select a link or leave blank for any link',
                      'groundhogg'),
          }) }

          ${ filterCount(rest) }

          ${ standardActivityDateOptions(rest) }`
    },
    onMount (filter, updateFilter) {

      linkPicker('#filter-link').on('change input blur', ({ target }) => {
        updateFilter({
          link: target.value,
        })
      })

      filterCountOnMount(updateFilter)

      standardActivityDateFilterOnMount(filter, updateFilter)
    },
    defaults: {
      ...standardActivityDateDefaults, ...filterCountDefaults,
      link: '',
    },
  })

  //filter by User Logged In
  registerFilter('logged_in', 'activity', __('Logged In', 'groundhogg'), {
    view (filter) {

      let prefix = filterCountTitle(`<b>${ __('Logged in', 'groundhogg') }</b>`,
        filter)

      return standardActivityDateTitle(prefix, filter)
    },
    edit (filter) {
      return filterCount(filter) + standardActivityDateOptions(filter)
    },
    onMount (filter, updateFilter) {
      filterCountOnMount(updateFilter)
      standardActivityDateFilterOnMount(filter, updateFilter)
    },
    defaults: {
      ...standardActivityDateDefaults, ...filterCountDefaults,
    },
  })

  registerFilter('logged_out', 'activity', __('Logged Out', 'groundhogg'), {
    view (filter) {
      return standardActivityDateTitle(
        filterCountTitle(`<b>${ __('Logged out', 'groundhogg') }</b>`, filter),
        filter)
    },
    edit (filter) {
      return filterCount(filter) + standardActivityDateOptions(filter)
    },
    onMount (filter, updateFilter) {
      filterCountOnMount(updateFilter)
      standardActivityDateFilterOnMount(filter, updateFilter)
    },
    defaults: {
      ...filterCountDefaults, ...standardActivityDateDefaults,
    },
  })

//filter by User Not Logged In
  registerFilter('not_logged_in', 'activity',
    __('Has Not Logged In', 'groundhogg'), {
      view (filter) {
        return standardActivityDateTitle(
          `<b>${ __('Has not logged in', 'groundhogg') }</b>`, filter)
      },
      edit (filter) {
        return standardActivityDateOptions(filter)
      },
      onMount (filter, updateFilter) {
        standardActivityDateFilterOnMount(filter, updateFilter)
      },
      defaults: {
        ...standardActivityDateDefaults,
      },
    })

//filter by User Was Active
  registerFilter('was_active', 'activity', __('Was Active', 'groundhogg'), {
    view (filter) {
      return standardActivityDateTitle(
        `<b>${ __('Was active', 'groundhogg') }</b>`, filter)
    },
    edit (filter) {
      return standardActivityDateOptions(filter)
    },
    onMount (filter, updateFilter) {
      standardActivityDateFilterOnMount(filter, updateFilter)
    },
    defaults: {
      ...standardActivityDateDefaults,
    },
  })

//filter By User Was Not Active
  registerFilter('was_not_active', 'activity', __('Was Inactive', 'groundhogg'),
    {
      view (filter) {
        return standardActivityDateTitle(
          `<b>${ __('Was inactive', 'groundhogg') }</b>`, filter)
      },
      edit (filter) {
        return standardActivityDateOptions(filter)
      },
      onMount (filter, updateFilter) {
        standardActivityDateFilterOnMount(filter, updateFilter)
      },
      defaults: {
        ...standardActivityDateDefaults,
      },
    })

// Other Filters to Add
// Location (Country,Province)
// Phones (Primary,Mobile)
// Tags

  registerFilterGroup('funnels',
    _x('Flows', 'noun meaning automation', 'groundhogg'))

  registerFilter('funnel_history', 'funnels',
    __('Flow History', 'groundhogg'), {
      view ({
        status = 'complete',
        funnel_id = 0,
        step_id = 0,
        date_range = 'any',
        before,
        after,
        ...rest
      }) {

        let prepend

        if (funnel_id) {

          const funnel = FunnelsStore.get(funnel_id)
          const step = funnel.steps.find(s => s.ID === step_id)

          prepend = status === 'complete' ? sprintf(
            step ? __('Completed %2$s in %1$s', 'groundhogg') : __(
              'Completed any step in %1$s', 'groundhogg'),
            `<b>${ funnel.data.title }</b>`,
            step ? `<b>${ step.data.step_title }</b>` : '') : sprintf(
            step ? __('Will complete %2$s in %1$s', 'groundhogg') : __(
              'Will complete any step in %1$s', 'groundhogg'),
            `<b>${ funnel.data.title }</b>`,
            step ? `<b>${ step.data.step_title }</b>` : '')

          if (status === 'waiting') {
            return prepend
          }

        }
        else {
          prepend = __('Completed any step in any flow', 'groundhogg')
        }

        return standardActivityDateTitle(prepend, {
          date_range,
          before,
          after,
          ...rest
        })
      },
      edit ({
        funnel_id,
        step_id,
        date_range,
        before,
        after,
        ...rest
      }) {

        return `
      ${ select({
          id: 'filter-funnel',
          name: 'funnel_id',
        }, FunnelsStore.getItems().
          map(f => ( {
            value: f.ID,
            text: f.data.title,
          } )), funnel_id) }
      ${ select({
          id: 'filter-step',
          name: 'step_id',
        }, funnel_id ? FunnelsStore.get(funnel_id).steps.map(s => ( {
          value: s.ID,
          text: s.data.step_title,
        } )) : [], step_id) }
      ${ standardActivityDateOptions({
          date_range,
          before,
          after,
          ...rest
        }) }`
      },
      onMount (filter, updateFilter) {
        funnelPicker('#filter-funnel', false, (items) => {
          FunnelsStore.itemsFetched(items)
        }, {}, {
          placeholder: __('Select a flow', 'groundhogg'),
        }).on('select2:select', ({ target }) => {
          updateFilter({
            funnel_id: parseInt($(target).val()),
            step_id: 0,
          }, true)
        })

        $('#filter-step').select2({
          placeholder: __('Select a step or leave empty for any step',
            'groundhogg'),
        }).on('select2:select', ({ target }) => {
          updateFilter({
            step_id: parseInt($(target).val()),
          })
        })

        standardActivityDateFilterOnMount(filter, updateFilter)
      },
      defaults: {
        funnel_id: 0,
        step_id  : 0,
        status   : 'complete', ...standardActivityDateDefaults,
      },
      preload : ({ funnel_id }) => {
        if (funnel_id) {
          return FunnelsStore.maybeFetchItem(funnel_id)
        }
      },
    })

  registerFilterGroup('broadcast',
    _x('Broadcast', 'noun meaning email blast', 'groundhogg'))

  registerFilter('broadcast_received', 'broadcast',
    __('Received Broadcast', 'groundhogg'), {
      view ({
        broadcast_id,
        status = 'complete',
      }) {

        if (!broadcast_id) {
          return __('Received any broadcast', 'groundhogg')
        }

        const broadcast = BroadcastsStore.get(broadcast_id)

        return status === 'complete'
               ? sprintf(broadcast ? __('Received %1$s on %2$s', 'groundhogg') : __(
              'Will receive a broadcast', 'groundhogg'),
            `<b>${ broadcast.object.data.title }</b>`,
            `<b>${ formatDateTime(broadcast.data.send_time * 1000) }</b>`)
               : sprintf(
            broadcast ? __('Will receive %1$s on %2$s', 'groundhogg') : __(
              'Received a broadcast', 'groundhogg'),
            `<b>${ broadcast.object.data.title }</b>`,
            `<b>${ formatDateTime(broadcast.data.send_time * 1000) }</b>`)
      },
      edit ({ broadcast_id }) {

        return select({
          id: 'filter-broadcast',
          name: 'broadcast_id',
        }, BroadcastsStore.getItems().
          map(b => ( {
            value: b.ID,
            text : `${ b.object.data.title } (${ b.date_sent_pretty })`,
          } )), broadcast_id)
      },
      onMount (filter, updateFilter) {
        broadcastPicker('#filter-broadcast', false, (items) => {
          BroadcastsStore.itemsFetched(items)
        }, {}, {
          placeholder: __('Select a broadcast', 'groundhogg'),
        }).on('select2:select', ({ target }) => {
          updateFilter({
            broadcast_id: parseInt($(target).val()),
          })
        })
      },
      defaults: {
        broadcast_id: 0,
        status: 'complete',
      },
      preload : ({ broadcast_id }) => {
        if (broadcast_id) {
          return BroadcastsStore.maybeFetchItem(broadcast_id)
        }
      },
    })

  registerFilter('broadcast_opened', 'broadcast',
    __('Opened Broadcast', 'groundhogg'), {
      view ({ broadcast_id }) {

        if (!broadcast_id) {
          return __('Opened any broadcast', 'groundhogg')
        }

        const broadcast = BroadcastsStore.get(broadcast_id)

        return sprintf(
          broadcast ? __('Opened %1$s after %2$s', 'groundhogg') : __(
            'Will receive a broadcast', 'groundhogg'),
          `<b>${ broadcast.object.data.title }</b>`,
          `<b>${ formatDateTime(broadcast.data.send_time * 1000) }</b>`)

      },
      edit ({ broadcast_id }) {

        return select({
          id: 'filter-broadcast',
          name: 'broadcast_id',
        }, BroadcastsStore.getItems().
          map(b => ( {
            value: b.ID,
            text : `${ b.object.data.title } (${ b.date_sent_pretty })`,
          } )), broadcast_id)
      },
      onMount (filter, updateFilter) {
        broadcastPicker('#filter-broadcast', false, (items) => {
          BroadcastsStore.itemsFetched(items)
        }, {}, {
          placeholder: __('Select a broadcast', 'groundhogg'),
        }).on('select2:select', ({ target }) => {
          updateFilter({
            broadcast_id: parseInt($(target).val()),
          })
        })
      },
      defaults: {
        broadcast_id: 0,
      },
      preload : ({ broadcast_id }) => {
        if (broadcast_id) {
          return BroadcastsStore.maybeFetchItem(broadcast_id)
        }
      },
    })

  registerFilter('broadcast_link_clicked', 'broadcast',
    __('Broadcast Link Clicked', 'groundhogg'), {
      view ({
        broadcast_id,
        link,
      }) {

        if (!broadcast_id && !link) {
          return __('Clicked any link in any broadcast', 'groundhogg')
        }

        if (!broadcast_id && link) {
          return sprintf(__('Clicked %s in any broadcast', 'groundhogg'),
            bold(link))
        }

        const broadcast = BroadcastsStore.get(broadcast_id)

        if (broadcast_id && !link) {
          return sprintf(
            __('Clicked any link in %1$s after %2$s', 'groundhogg'),
            bold(broadcast.object.data.title),
            bold(formatDateTime(broadcast.data.send_time * 1000)))
        }

        return sprintf(__('Clicked %1$s in %2$s after %3$s', 'groundhogg'),
          bold(link), bold(broadcast.object.data.title),
          bold(formatDateTime(broadcast.data.send_time * 1000)))
      },
      edit ({
        broadcast_id,
        link,
      }) {

        // language=html
        return `
            ${ select({
                id: 'filter-broadcast',
                name: 'broadcast_id',
            }, BroadcastsStore.getItems().map(b => ( {
                value: b.ID,
                text : `${ b.object.data.title } (${ b.date_sent_pretty })`,
            } )), broadcast_id) }

            ${ input({
                id          : 'filter-link',
                name        : 'link',
                value       : link,
                autocomplete: 'off',
                placeholder : __(
                        'Start typing to select a link or leave blank for any link',
                        'groundhogg'),
            }) }`
      },
      onMount (filter, updateFilter) {
        broadcastPicker('#filter-broadcast', false, (items) => {
          BroadcastsStore.itemsFetched(items)
        }, {}, {
          placeholder: __(
            'Please select a broadcast or leave blank for any broadcast',
            'groundhogg'),
        }).on('change', (e) => {
          updateFilter({
            broadcast_id: parseInt(e.target.value),
          })
        })

        linkPicker('#filter-link').on('change input blur', ({ target }) => {
          updateFilter({
            link: target.value,
          })
        })
      },
      defaults: {
        link: '',
        broadcast_id: 0,
      },
      preload : ({ broadcast_id }) => {
        if (broadcast_id) {
          return BroadcastsStore.maybeFetchItem(broadcast_id)
        }
      },
    })

  ContactFilterRegistry.registerFromProperties(Groundhogg.filters.gh_contact_custom_properties)

  const registerActivityFilter = (id, group, label, {
    view = () => {
    },
    edit = () => {
    },
    onMount = () => {
    },
    defaults = {},
  }) => {

    registerFilter(id, group, label, {
      view (filter) {
        return standardActivityDateTitle(filterCountTitle(view(filter), filter),
          filter)
      },
      edit (filter) {
        return [
          edit(filter),
          filterCount(filter),
          standardActivityDateOptions(filter),
        ].join('')
      },
      onMount (filter, updateFilter) {
        onMount(filter, updateFilter)
        filterCountOnMount(updateFilter)
        standardActivityDateFilterOnMount(filter, updateFilter)
      },
      defaults: {
        ...defaults, ...standardActivityDateDefaults, ...filterCountDefaults,
      },
    })

  }

  const registerActivityFilterWithValue = (id, group, label, {
    view = () => {
    },
    edit = () => {
    },
    onMount = () => {
    },
    defaults = {},
    ...rest
  }) => {
    registerFilter(id, group, label, {
      view (filter) {

        let {
          value,
          value_compare,
        } = filter

        let content = view(filter)

        if (value && value_compare) {
          content += ` worth ${ activityFilterComparisons[value_compare].toLowerCase() } ${ value }`
        }

        return standardActivityDateTitle(filterCountTitle(content, filter),
          filter)
      },
      edit (filter) {

        let {
          value,
          value_compare,
        } = filter

        return [
          edit(filter), //language=HTML
          `
              <div class="space-between" style="gap: 10px">
                  <span class="gh-text">Value</span>
                  <div class="gh-input-group">
                      ${ select({
                          id      : 'filter-value-compare',
                          name    : 'value_compare',
                          options : activityFilterComparisons,
                          selected: value_compare,
                      }) }
                      ${ input({
                          type        : 'number',
                          id          : 'filter-value',
                          name        : 'value',
                          autocomplete: 'off',
                          value       : value,
                          placeholder : 'any value',
                          style       : {
                              width: '100px',
                          },
                      }) }
                  </div>
              </div>
          `,
          filterCount(filter),
          standardActivityDateOptions(filter),
        ].join('')
      },
      onMount (filter, updateFilter) {
        onMount(filter, updateFilter)

        $('#filter-value,#filter-value-compare').on('change', (e) => {
          updateFilter({
            [e.target.name]: e.target.value,
          })
        })

        filterCountOnMount(updateFilter)
        standardActivityDateFilterOnMount(filter, updateFilter)
      },
      defaults: {
        ...defaults, ...standardActivityDateDefaults, ...filterCountDefaults,
        value        : 0,
        value_compare: 'greater_than_or_equal_to',
      },
      ...rest
    })

  }

  registerActivityFilterWithValue('custom_activity', 'activity',
    __('Custom Activity', 'groundhogg'), {
      view: ({ activity }) => `<b>${ activity }</b>`,
      edit: ({
        activity,
        ...filter
      }) => {
        return [
          input({
            id         : 'filter-activity-type',
            name       : 'activity',
            value      : activity,
            placeholder: 'custom_activity',
          }),
          `<label>${ __('Filter by activity meta', 'groundhogg') }</label>`,
          `<div id="custom-activity-meta-filters"></div>`,
        ].join('')
      },
      onMount (filter, updateFilter) {
        $('#filter-activity-type').on('input', e => {
          updateFilter({
            activity: e.target.value,
          })
        })

        let { meta_filters = [] } = filter

        inputRepeater('#custom-activity-meta-filters', {
          rows    : meta_filters,
          cells   : [
            props => input({
              placeholder: 'Key',
              className  : 'input',
              ...props,
            }),
            ({
              value,
              ...props
            }) => select({
              selected: value,
              options : AllComparisons,
              ...props,
            }),
            props => input({
              placeholder: 'Value',
              className  : 'input',
              ...props,
            }),
          ],
          addRow: () => [ '', 'equals', '' ],
          onChange: rows => {
            updateFilter({
              meta_filters: rows,
            })
          },
        }).mount()
      },
      defaults: {
        activity    : '',
        meta_filters: [],
      },
    })

  registerFilterGroup('query', 'Query')

  registerFilter('saved_search', 'query', __('Saved Search'), {
    view    : ({
      compare = 'in',
      search,
    }) => {
      return sprintf(__('Is %s search %s'), compare === 'in' ? 'in' : 'not in', bold(SearchesStore.get(search)?.name))
    },
    edit    : ({ compare }) => {
      return [
        select({
          name    : 'filter_compare',
          id      : 'filter-compare',
          options : {
            in    : __('In'),
            not_in: __('Not in'),
          },
          selected: compare,
        }),
        select({
          name: 'filter_search',
          id  : 'filter-search',
        }),
      ].join('')
    },
    onMount : ({ search }, updateFilter) => {

      SearchesStore.maybeFetchItems().then(items => {

        $('#filter-search').select2({
          data       : [
            {
              id  : '',
              text: '',
            },
            ...items.map(({
              id,
              name,
            }) => ( {
              id,
              text    : name,
              selected: id === search,
            } )),
          ],
          placeholder: __('Type to search...'),
        }).on('change', e => {
          updateFilter({
            search: e.target.value,
          })
        })
      })

      $('#filter-compare').on('change', e => {
        updateFilter({
          compare: e.target.value,
        })
      })

    },
    defaults: {
      compare: 'in',
      search : null,
    },
    preload : ({ search }) => {
      // just preload all searches
      if (!SearchesStore.hasItems()) {
        return SearchesStore.fetchItems([])
      }
    },
  })

  ContactFilterRegistry.registerFilter(createFilter('sub_query', 'Sub Query', 'query', {
    display: ({
      include_filters = [],
      exclude_filters = [],
    }) => {

      let texts = [
        ContactFilterRegistry.displayFilters(include_filters),
        ContactFilterRegistry.displayFilters(exclude_filters),
      ]

      if (include_filters.length && exclude_filters.length) {
        return texts.join(' <abbr title="exclude">and exclude</abbr> ')
      }

      if (exclude_filters.length) {
        return sprintf('<abbr title="exclude">Exclude</abbr> %s', texts[1])
      }

      if (include_filters.length) {
        return texts[0]
      }

      throw new Error('No filters defined.')

    },
    edit   : ({
      include_filters = [],
      exclude_filters = [],
      updateFilter,
    }) => {

      return Fragment([
        Div({
          className: 'include-search-filters',
        }, [
          Filters({
            id            : 'sub-query-filters',
            filters       : include_filters,
            filterRegistry: ContactFilterRegistry,
            onChange      : include_filters => updateFilter({
              include_filters,
            }),
          }),
        ]),
        Div({
          className: 'exclude-search-filters',
        }, [
          Filters({
            id            : 'sub-query-exclude-filters',
            filters       : exclude_filters,
            filterRegistry: ContactFilterRegistry,
            onChange      : exclude_filters => updateFilter({
              exclude_filters,
            }),
          }),
        ]),
      ])
    },
    preload: ({
      include_filters = [],
      exclude_filters = [],
    }) => {
      return Promise.all([
        ContactFilterRegistry.preloadFilters(include_filters),
        ContactFilterRegistry.preloadFilters(exclude_filters),
      ])
    },
  }, {}))

  ContactFilterRegistry.registerFilter(createFilter('secondary_related', 'Is Child Of', 'query', {
    edit   : ({object_type= '', object_id = '', updateFilter }) => Fragment([
      Input({
        id: 'object-type',
        name: 'object_type',
        value: object_type,
        placeholder: 'Parent Type',
        onInput: e => {
          updateFilter({
            object_type: e.target.value
          })
        }
      }),
      Input({
        type: 'number',
        id: 'object-id',
        name: 'object_id',
        value: object_id,
        placeholder: 'Parent ID',
        min: 0,
        onInput: e => {
          updateFilter({
            object_id: e.target.value
          })
        }
      })
    ]),
    display: ({
      object_type,
      object_id,
    }) => {
      if ( ! object_type ){
        throw new Error( 'Type be defined' )
      }

      if ( ! object_id ){
        return `Is a child of ${ object_type }`
      }

      return `Is a child of ${ object_type } with ID ${ object_id }`
    }
  }, {
    object_type: 'contact'
  }))

  ContactFilterRegistry.registerFilter(createFilter('primary_related', 'Is Parent Of', 'query', {
    edit   : ({object_type= '', object_id = '', updateFilter }) => Fragment([
      Input({
        id: 'object-type',
        name: 'object_type',
        value: object_type,
        placeholder: 'Child Type',
        onInput: e => {
          updateFilter({
            object_type: e.target.value
          })
        }
      }),
      Input({
        type: 'number',
        id: 'object-id',
        name: 'object_id',
        value: object_id,
        placeholder: 'Child ID',
        min: 0,
        onInput: e => {
          updateFilter({
            object_id: e.target.value
          })
        }
      })
    ]),
    display: ({
      object_type,
      object_id,
    }) => {
      if ( ! object_type ){
        throw new Error( 'Type must be defined' )
      }

      if ( ! object_id ){
        return `Is a parent of ${ object_type }`
      }

      return `Is a parent of ${ object_type } with ID ${ object_id }`
    }
  }, {
    object_type: 'contact'
  }))

  registerFilterGroup( 'date', 'Date' )

  const CurrentDateCompareFilterFactory = ( id, name, type, formatter ) => createFilter(id, name, 'date', {
    edit   : ({compare= '', after = '', before = '', updateFilter }) => Fragment([
      Select({
        id: 'select-compare',
        selected:  compare,
        options: {
          after: 'After',
          before: 'Before',
          between: 'Between'
        },
        onChange: e => {
          updateFilter({
            compare: e.target.value
          })
        }
      }),
      compare === 'before' ? null : Input({
        type,
        id: 'after-date',
        name: 'after_date',
        value: after,
        placeholder: 'After...',
        onChange: e => {
          updateFilter({
            after: e.target.value
          })
        }
      }),
      compare === 'after' ? null : Input({
        type,
        id: 'before-date',
        name: 'before_date',
        value: before,
        placeholder: 'Before...',
        min: 0,
        onInput: e => {
          updateFilter({
            before: e.target.value
          })
        }
      })
    ]),
    display: ({
      compare = '',
      after,
      before,
    }) => {

      let prefix = `<b>${name}</b>`

      switch (compare) {
        case 'between':
          return ComparisonsTitleGenerators.between(prefix,
            formatter(after), formatter(before))
        case 'after':
          return ComparisonsTitleGenerators.after(prefix,
            formatter(after))
        case 'before':
          return ComparisonsTitleGenerators.before(prefix,
            formatter(before))
        default:
          throw new Error( 'Invalid date comparison.' )
      }
    },
  }, {
    compare: 'between',
    before: '',
    after: '',
  })

  ContactFilterRegistry.registerFilter(CurrentDateCompareFilterFactory('current_datetime', 'Current Date & Time', 'datetime-local', formatDateTime ))
  ContactFilterRegistry.registerFilter(CurrentDateCompareFilterFactory('current_date', 'Current Date', 'date', formatDate ))
  ContactFilterRegistry.registerFilter(CurrentDateCompareFilterFactory('current_time', 'Current Time', 'time', ( time ) => formatTime(`2000-01-01T${time}`) ))

  registerFilterGroup( 'submissions', 'Submissions' )

  const SubmissionMetaFilters = (meta_filters, updateFilter) => InputRepeater({
    id      : 'submission-meta-filters',
    rows    : meta_filters,
    cells   : [
      props => Input({
        ...props,
        placeholder: 'Field Name',
      }),
      ({
        value,
        ...props
      }) => Select({
        selected: value,
        options : AllComparisons,
        ...props,
      }),
      props => Input({
        ...props,
        placeholder: 'Value',
      }),
    ],
    fillRow : () => [
      '',
      'equals',
      '',
    ],
    onChange: rows => {
      updateFilter({
        meta_filters: rows,
      })
    },
  })

  ContactFilterRegistry.registerFilter(createPastDateFilter('form_submissions', 'Form Submissions', 'submissions', {
    display: ({ form_id = [] }) => {

      if (!form_id.length) {
        return 'Submitted any form'
      }

      return `Submitted ${ orList(form_id.map(id => bold(Groundhogg.stores.forms.get(id).name))) }`
    },
    preload: ({
      form_id = [],
    }) => {
      if (form_id.length) {
        return Groundhogg.stores.forms.maybeFetchItems(form_id)
      }
    },
    edit   : ({
      form_id = [],
      meta_filters = [],
      updateFilter = () => {},
    }) => {

      return Fragment([

        ItemPicker({
          id: 'select-form',
          // label: '',
          noneSelected: 'Any form',
          fetchOptions: async search => {
            let forms = await Groundhogg.stores.forms.fetchItems({
              search,
            })

            return forms.map(item => ( {
              id  : item.ID,
              text: item.name,
            } ))
          },
          selected    : form_id.map(id => ( {
            id,
            text: Groundhogg.stores.forms.get(id).name,
          } )),
          onChange    : (items) => {
            updateFilter({
              form_id: items.map(item => item.id),
            })
          },
        }),

        `<label>${ __('Filter by fields', 'groundhogg') }</label>`,
        SubmissionMetaFilters(meta_filters, updateFilter),
      ])
    },
  }, {
    form_id     : [],
    meta_filters: [],
  }))

  const StepPicker = (type, step_id, updateFilter) => ItemPicker({
    id: 'select-webhook',
    // label: '',
    noneSelected: 'Any webhook',
    fetchOptions: async search => {
      let steps = await Groundhogg.stores.steps.fetchItems({
        search,
        step_type: type,
        status   : 'active',
      })

      return steps.map(item => ( {
        id  : item.ID,
        text: item.data.step_title,
      } ))
    },
    selected    : step_id.map(id => ( {
      id,
      text: Groundhogg.stores.steps.get(id).data.step_title,
    } )),
    onChange    : (items) => {
      updateFilter({
        step_id: items.map(item => item.id),
      })
    },
  })

  if (typeof Groundhogg.rawStepTypes.http_post !== 'undefined') {
    ContactFilterRegistry.registerFilter(createPastDateFilter('webhook_response', 'Webhook Response', 'submissions', {
      display: ({ step_id = [] }) => {

        if (!step_id.length) {
          return 'Any webhook response'
        }

        return `Webhook response from ${ orList(step_id.map(id => bold(Groundhogg.stores.steps.get(id).data.step_title))) }`
      },
      preload: ({
        step_id = [],
      }) => {
        if (step_id.length) {
          return Groundhogg.stores.steps.maybeFetchItems(step_id)
        }
      },
      edit   : ({
        step_id = [],
        meta_filters = [],
        updateFilter = () => {},
      }) => {

        return Fragment([

          StepPicker('http_post', step_id, updateFilter),

          `<label>${ __('Filter by fields', 'groundhogg') }</label>`,
          SubmissionMetaFilters(meta_filters, updateFilter),
        ])
      },
    }, {
      step_id     : [],
      meta_filters: [],
    }))
  }

  if (typeof Groundhogg.rawStepTypes.webhook_listener !== 'undefined') {
    ContactFilterRegistry.registerFilter(createPastDateFilter('webhook_request', 'Webhook Request', 'submissions', {
      display: ({ step_id = [] }) => {

        if (!step_id.length) {
          return 'Any webhook request'
        }

        return `Webhook request to ${ orList(step_id.map(id => bold(Groundhogg.stores.steps.get(id).data.step_title))) }`
      },
      preload: ({
        step_id = [],
      }) => {
        if (step_id.length) {
          return Groundhogg.stores.steps.maybeFetchItems(step_id)
        }
      },
      edit   : ({
        step_id = [],
        meta_filters = [],
        updateFilter = () => {},
      }) => {

        return Fragment([
          StepPicker('webhook_listener', step_id, updateFilter),
          `<label>${ __('Filter by fields', 'groundhogg') }</label>`,
          SubmissionMetaFilters(meta_filters, updateFilter),
        ])
      },
    }, {
      step_id     : [],
      meta_filters: [],
    }))
  }

  if (!Groundhogg.filters) {
    Groundhogg.filters = {}
  }

  Groundhogg.filters.ContactFilters = ContactFilters
  Groundhogg.filters.ContactFilterDisplay = ContactFilterDisplay
  Groundhogg.filters.ContactFilterRegistry = ContactFilterRegistry

  Groundhogg.filters.functions = {
    createFilters,
    registerFilter,
    registerFilterGroup,
    ComparisonsTitleGenerators,
    AllComparisons,
    NumericComparisons,
    StringComparisons,
    standardActivityDateOptions,
    standardActivityDateTitle,
    standardActivityDateDefaults,
    standardActivityDateFilterOnMount,
    BasicTextFilter,
    registerActivityFilter,
    registerActivityFilterWithValue,
  }

} )(jQuery)
