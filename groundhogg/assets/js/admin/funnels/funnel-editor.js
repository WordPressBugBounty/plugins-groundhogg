( function ($) {

  const {
    patch,
    routes,
    ajax,
  } = Groundhogg.api

  const {
    funnels  : FunnelsStore,
    campaigns: CampaignsStore,
  } = Groundhogg.stores

  const {
    Div,
    Pg,
    Span,
    H3,
    Img,
    An,
    Button,
    Dashicon,
    ToolTip,
    Modal,
    ModalFrame,
    Textarea,
    ItemPicker,
    Input,
  } = MakeEl

  const {
    icons,
    uuid,
    moreMenu,
    tooltip,
    dialog,
    dangerConfirmationModal,
    confirmationModal,
    adminPageURL,
    loadingModal,
    modal,
  } = Groundhogg.element

  const {
    sprintf,
    __,
    _x,
    _n,
  } = wp.i18n

  const getFunnel = () => FunnelsStore.get(Funnel.id)

  if (typeof Funnel !== 'undefined' && Funnel.is_editor) {

    FunnelsStore.itemsFetched([Funnel])

    const syncReplacementCodes = () => {

      let flowReplacements = getFunnel().meta.replacements || {}

      // remove all replacements under this_flow from the replacements object
      // re-add replacements direct from meta

      // Filter out keys in Groundhogg.replacements that start with "this_flow"
      Groundhogg.replacements.codes = Object.entries(Groundhogg.replacements.codes).reduce((acc, [key, value]) => {
        if (value.group !== 'this_flow') {
          acc[key] = value
        }
        return acc
      }, {})

      Groundhogg.replacements.groups.this_flow = 'This Flow'

      for (const [key, value] of Object.entries(flowReplacements)) {
        Groundhogg.replacements.codes[`__this_flow_${ key }`] = {
          code  : `this_flow.${ key }`,
          desc  : '',
          name  : key,
          group : 'this_flow',
          insert: `{this_flow.${ key }}`,
        }
      }
    }

    const createPlaceholderEl = (data) => {

      let {
        step_group,
        step_type,
      } = data

      let placeholder = Div({
        className: `step step-placeholder ${ step_group } ${ step_type }`,
      }, [
        Input({
          type : 'hidden',
          name : 'step_ids[]',
          value: JSON.stringify(data),
        }),
        Div({ className: 'hndle' }, [
          // icon
          Div({ className: 'hndle-icon' }, Groundhogg.rawStepTypes[step_type].svg),
          Div({}, [
            // title,
            Span({ className: 'step-title loading-dots' }, 'Loading'),
            // name
            Span({ className: 'step-name' }, Groundhogg.rawStepTypes[step_type].name),
          ]),
        ]),
      ])

      if (step_group !== 'benchmark') {
        placeholder = Div({ className: `sortable-item ${ step_group } ${ step_type }` }, [
          Div({}), // for space
          Div({ className: 'flow-line' }),
          placeholder,
          Div({ className: 'flow-line' }),
        ])
      }

      return placeholder

    }

    const UndoRedoManager = {

      // The size of the stack to maintain
      stackSize: 50,
      // Where we are in the history
      pointer: 0,
      // The changes we've made
      changes: [],

      timeout: null,

      morph () {
        let el = document.getElementById('undo-and-redo')
        if (el) {
          morphdom(el, UndoRedo())
        }
      },

      // Add a state to the history
      addChange (state) {

        // use a timeout to avoid creating too many states from onInput events
        if (this.timeout) {
          clearTimeout(this.timeout)
        }

        this.timeout = setTimeout(() => {

          // remove elements past the current pointer
          this.changes = this.changes.slice(0, this.pointer + 1)

          // Add the new state
          this.changes.push(state)

          // Maintain size of 50 for memory reasons
          if (this.changes.length > this.stackSize) {
            this.changes.shift()
          }

          // Set the pointer to the end of the changelist
          this.pointer = this.changes.length - 1

          this.morph()
        }, 100)
      },
      hasChanges () {
        return this.changes.length > 0
      },

      getState (index) {
        return this.changes[index]
      },

      canUndo () {
        return this.changes.length && this.pointer > 0
      },

      canRedo () {
        return this.pointer < this.changes.length - 1
      },

      restoreState () {
        let state = this.getState(this.pointer)
        Funnel.save({
          quiet  : true,
          restore: state,
        }).then(() => this.morph())
      },

      undo () {

        if (!this.canUndo()) {
          return
        }

        this.pointer--
        this.restoreState()
      },

      redo () {

        if (!this.canRedo()) {
          return
        }

        this.pointer++
        this.restoreState()
      },

      clear () {
        this.pointer = 0
        this.changes = []
      },

    }

    const UndoRedo = () => Div({
        className: 'gh-input-group',
        id       : 'undo-and-redo',
      },
      [
        Button({
            id       : 'editor-undo',
            className: 'gh-button secondary text',
            disabled : !UndoRedoManager.canUndo(),
            onClick  : e => {
              UndoRedoManager.undo()
            },
          },
          [
            Dashicon('undo'),
            ToolTip('Undo', 'bottom'),
          ]),
        Button({
            id       : 'editor-redo',
            className: 'gh-button secondary text',
            disabled : !UndoRedoManager.canRedo(),
            onClick  : e => {
              UndoRedoManager.redo()
            },
          },
          [
            Dashicon('redo'),
            ToolTip('Redo', 'bottom'),
          ]),
      ])

    const FlowSettings = () => {

      const State = Groundhogg.createState({
        saving: false,
      })

      let funnel = getFunnel()

      let {
        description = '',
        replacements = {},
      } = funnel.meta
      let { campaigns = [] } = funnel
      CampaignsStore.itemsFetched( campaigns )
      let campaignIds = campaigns.map(c => c.ID)

      return MakeEl.Div({
        id: 'flow-settings',
      }, morph => {

        return Div({
          className: 'display-flex gap-20 column',
        }, [
          Div({
            className: 'gh-panel',
          }, [
            Div({
              className: 'gh-panel-header',
            }, [
              MakeEl.H2({}, 'General Settings'),
            ]),
            Div({
              className: 'inside',
            }, [
              `<p>Add a simple description.</p>`,
              Textarea({
                id       : 'funnel-description',
                className: 'full-width',
                onInput  : e => {
                  description = e.target.value
                },
                value    : description,
              }),
            ]),
          ]),
          Div({
            className: 'gh-panel',
          }, [
            Div({
              className: 'gh-panel-header',
            }, [
              MakeEl.H2({}, 'Campaigns'),
            ]),
            Div({
              className: 'inside',
            }, [
              `<p>Use <b>campaigns</b> to organize your flows. Use terms like <code>Black Friday</code> or <code>Sales</code>.</p>`,
              ItemPicker({
                id          : 'pick-campaigns',
                noneSelected: 'Add a campaign...',
                selected    : campaigns.map(({
                  ID,
                  data,
                }) => ( {
                  id  : ID,
                  text: data.name,
                } )),
                tags        : true,
                fetchOptions: async (search) => {
                  let campaigns = await CampaignsStore.fetchItems({
                    search,
                    limit: 20,
                  })

                  return campaigns.map(({
                    ID,
                    data,
                  }) => ( {
                    id  : ID,
                    text: data.name,
                  } ))
                },
                createOption: async value => {
                  let campaign = await CampaignsStore.create({
                    data: {
                      name: value,
                    },
                  })

                  return {
                    id  : campaign.ID,
                    text: campaign.data.name,
                  }
                },
                onChange    : items => {
                  campaignIds = items.map(item => item.id)
                  campaigns = campaignIds.map(id => CampaignsStore.get(id))
                },
              }),
            ]),
          ]),
          Div({
            className: 'gh-panel',
          }, [
            Div({
              className: 'gh-panel-header',
            }, [
              MakeEl.H2({}, 'Flow Replacements'),
            ]),
            Div({
              className: 'inside',
            }, [
              `<p>${ __(
                'Define custom replacements that are only used in the context of this flow. Usage is <code>{this_flow.replacement_key}</code>.') }</p>`,
              MakeEl.InputRepeater({
                id      : 'flow-replacements-editor',
                rows    : Object.entries(replacements),
                cells   : [
                  props => Input({
                    ...props,
                    placeholder: 'Key',
                  }),
                  props => Input({
                    ...props,
                    placeholder: 'Value',
                  }),

                ],
                onChange: rows => {
                  replacements = {}
                  rows.forEach(([key, val]) => replacements[key] = val)
                },
              }),
            ]),
          ]),
          Div({
            className: 'display-flex flex-end',
          }, Button({
            id       : 'save-settings',
            className: 'gh-button primary',
            disabled : State.saving,
            onClick  : async e => {

              State.set({
                saving: true,
              })

              morph()

              await FunnelsStore.patch(getFunnel().ID, {
                campaigns: campaignIds,
                meta     : {
                  description,
                  replacements,
                },
              })

              State.set({
                saving: false,
              })

              morph()

              syncReplacementCodes()

              dialog({
                message: 'Changes saved!',
              })
            },
          }, State.saving ? '<span class="gh-spinner"></span>' : 'Save Settings')),
        ])
      })
    }

    const morphSettings = () => morphdom(document.getElementById('flow-settings'), FlowSettings())

    $.extend(Funnel, {

      sortables      : null,
      editing        : false,
      addCurrentGroup: 'all',
      addSearch      : '',
      addEl          : null,
      targetStep     : null,
      targetAdd      : null,
      lastSaved      : null,

      stepCallbacks: {},

      views: [
        {
          match  : /^\d+$/, // step settings,
          handler: function (matches) {
            this.startEditing(parseInt(matches[0]))
            this.showSettings()
          },
        },
        {
          match  : /^simulator$/,
          handler: function () {
            this.showSettings()
            this.showSimulator()
          },
        },
        {
          match  : /^add$/,
          handler: function (matches) {
            if (this.addCurrentGroup) {
              window.location.hash = `add/${ this.addCurrentGroup }`
            }
            else {
              window.location.hash = `add/all`
            }
          },
        },
        {
          match  : /^add\/(action|logic|benchmark|all)$/,
          handler: function (matches) {
            this.showSettings()
            this.showAddStep()

            this.addCurrentGroup = matches[1]

            this.clearSearch()
            this.setCurrentGroupButtonToCurrent()
            this.filterStepTypes()

            setTimeout(() => {
              scrollIntoViewIfNeeded(this.addEl, document.querySelector(`.fixed-inside`))
            }, 300)
          },
        },
        {
          match  : /^settings$/,
          handler: function () {
            this.showSettings()
            this.startEditing(null)
            morphSettings()
          },
        },
        {
          match  : /^share$/,
          handler: function (id) {

          },
        },
        {
          match  : /^$/, // no hash
          handler: function () {
            this.hideSettings()
            this.startEditing(null)
          },
        },
      ],

      clearSearch () {
        this.addSearch = ''
        $('#step-search').val('')
      },

      handleHashChange () {
        const hash = window.location.hash.substring(1)
        for (const view of this.views) {
          const result = view.match.exec(hash)
          if (result) {
            document.getElementById('step-settings-inner').dataset.view = hash || 'settings'
            view.handler.apply(this, [result])
            return
          }
        }
      },

      filterStepTypes () {
        $(`.select-step`).addClass('visible')

        // filter by addGroup
        if (this.addCurrentGroup !== 'all') {
          $(`.select-step:not(:has([data-group="${ this.addCurrentGroup }" i]))`).removeClass('visible')
        }

        if (this.addSearch) {
          $(`.select-step:not([data-keywords*="${ this.addSearch }" i])`).removeClass('visible')
        }
      },

      setCurrentGroupButtonToCurrent () {
        $('button.step-filter').removeClass('current')
        $(`button.step-filter[data-group="${ this.addCurrentGroup }"]`).addClass('current')
      },

      /**
       * Register letious step callbacks
       *
       * @param type
       */
      registerStepCallbacks (type, callbacks) {
        this.stepCallbacks[type] = callbacks
      },

      init: async function () {

        let $document = $(document)
        let $form = $('#funnel-form')

        let preloaders = [
          FunnelsStore.maybeFetchItem(this.id),
        ]

        // Preload emails
        let emails = this.steps.filter(step => step.data.step_type === 'send_email').
          map(step => parseInt(step.meta.email_id))

        if (emails.length) {
          preloaders.push(Groundhogg.stores.emails.maybeFetchItems(emails))
        }

        // Preload tags
        let tags = this.steps.filter(
            ({ data: { step_type } }) => [
              'apply_tag',
              'remove_tag',
              'tag_applied',
              'tag_removed',
            ].includes(step_type)).
          reduce((allTags, { meta: { tags } }) => {

            if (!Array.isArray(tags)) {
              return allTags
            }

            tags.forEach(id => {
              if (!allTags.includes(id)) {
                allTags.push(id)
              }
            })

            return allTags
          }, [])

        if (tags.length) {
          preloaders.push(Groundhogg.stores.tags.maybeFetchItems(tags))
        }

        if (tags.length || emails.length) {
          const { close } = loadingModal()
          await Promise.all(preloaders)
          close()
        }

        // handle focused step for copying
        $document.on('click', e => {
          if (Groundhogg.element.clickedIn(e, '#step-flow .step')) {
            this.targetStep = e.target.closest('.step')
          }
          else {
            this.targetStep = null
          }

          if (Groundhogg.element.clickedIn(e, '#step-flow button.add-step')) {
            this.targetAdd = e.target.closest('button.add-step')
          }
          else {
            this.targetAdd = null
          }
        })

        // handle ctrl v, ctrl c
        $document.on('keydown', async e => {
          if (e.key === 'c' && ( e.ctrlKey || e.metaKey ) && this.editing && this.targetStep) {
            navigator.clipboard.writeText(JSON.stringify({
              copy : this.editing,
              group: this.targetStep.dataset.group,
              type : this.targetStep.dataset.type,
            }))
            dialog({
              message: 'Step copied!',
            })
          }
          if (e.key === 'v' && ( e.ctrlKey || e.metaKey ) && this.targetAdd && this.addEl) {

            let text = await navigator.clipboard.readText()

            let json

            try {
              json = JSON.parse(text)
              if (!json) {
                throw new Error('invalid step')
              }

            }
            catch (err) {
              dialog({
                message: err.message,
                type   : 'error',
              })
              return
            }

            let branch = this.targetAdd.closest('.step-branch').dataset.branch
            let data = {
              copy      : json.copy,
              step_group: json.group,
              step_type : json.type,
              branch    : branch,
            }

            let placeholder = createPlaceholderEl(data)

            this.targetAdd.insertAdjacentElement('beforebegin', placeholder)

            drawLogicLines()

            this.save(true).then(() => {
              this.targetAdd = null
              if (this.addEl) {
                this.addEl = document.getElementById(this.addEl.id)
                if (this.addEl) {
                  this.addEl.classList.add('here')
                }
              }
            })

          }
          if (e.key === 'm' && ( e.ctrlKey || e.metaKey ) && this.editing) {
            // cancel
            if (this.moving) {
              document.body.classList.remove('gh-moving-step')
              this.moving = null
              drawLogicLines()
              return
            }

            this.hideSettings()
            this.moving = document.getElementById(`step-${ this.editing }`).closest('.sortable-item')
            document.body.classList.add('gh-moving-step')
            drawLogicLines()
          }

        })

        const settingsHidden = () => $('#step-settings-container').hasClass('slide-out')

        $document.on('click', '#collapse-settings', e => {

          if (settingsHidden()) {
            window.location.hash = 'settings'
          }
          else {
            window.location.hash = ''
          }
        })

        $document.on('click', '#step-flow .step:not(.step-placeholder)', e => {

          if ($(e.target).is('.dashicons, button')) {
            return
          }

          if (this.moving) {
            dialog({
              message: 'Click on any add icon to move the steps.',
              type   : 'info',
            })
            return
          }

          window.location.hash = e.currentTarget.dataset.id
        })

        $document.on('click', '#step-flow', e => {
          if (!Groundhogg.element.clickedIn(e, '.step,.add-step')) {
            window.location.hash = ''
          }
        })

        $document.on('click', 'button.step-filter:not(.current)', e => {
          window.location.hash = `add/${ e.currentTarget.dataset.group }`
        })

        $('#step-search').on('input', e => {
          this.addSearch = e.target.value
          this.filterStepTypes()
        })

        $document.on('mousedown', '.step-element.premium', e => {

          ModalFrame({},
            ({ close }) => Div({
              style: {
                position: 'relative',
              },
            }, [
              Button({
                className: 'gh-button secondary text icon',
                onClick  : close,
                style    : {
                  position: 'absolute',
                  top     : '5px',
                  right   : '5px',
                },
              }, Dashicon('no-alt')),
              An({
                href  : 'https://groundhogg.io/pricing/',
                target: '_blank',
              }, Img({
                style    : {
                  borderRadius: '10px',
                },
                className: 'has-box-shadow',
                src      : `${ Groundhogg.assets.images }upgrade-needed.png`,
              })),
            ]),
          )
        })

        // clicking on an add-step icon in the flow
        // handles both moving and non-moving state
        $document.on('click', 'button.add-step', e => {

          this.clearAddEl()
          this.addEl = e.currentTarget
          this.addEl.classList.add('here')

          if (this.moving) {

            // if parent is a branch
            if (this.addEl.parentElement.matches('.step-branch')) {
              this.addEl.insertAdjacentElement('beforebegin', this.moving)
            }
            // if parent is a sortable-item
            else if (this.addEl.parentElement.matches('.sortable-item')) {
              this.addEl.parentElement.insertAdjacentElement('beforebegin', this.moving)
            }

            document.body.classList.remove('gh-moving-step')

            drawLogicLines()
            this.moving = null
            this.save({
              quiet: true,
            })

            return
          }

          if (this.addEl.matches('.add-benchmark')) {
            window.location.hash = `add/benchmark`
          }
          else if (this.addEl.matches('.add-action')) {
            window.location.hash = `add/action`
          }
          else {
            window.location.hash = `add/${ this.addCurrentGroup }`
          }
        })

        // clicking on a step element icon to add it into the flow at the highlighted position
        $document.on('click', '.step-element.step-draggable:not(.premium)', e => {

          if (!this.addEl) {
            dialog({
              message: 'Click on a + icon in the flow first.',
              type   : 'info',
            })
            return
          }

          // might be doing something else already
          if (this.saving) {
            return
          }

          let branch = this.addEl.closest('.step-branch').dataset.branch

          let group = e.currentTarget.dataset.group
          let type = e.currentTarget.dataset.type

          let data = {
            step_type : type,
            step_group: group,
            branch    : branch,
          }

          let placeholder = createPlaceholderEl(data)

          this.addEl.insertAdjacentElement('beforebegin', placeholder)

          drawLogicLines()

          this.save(true).then(() => {
            if (this.addEl) {
              this.addEl = document.getElementById(this.addEl.id)
              if (this.addEl) {
                this.addEl.classList.add('here')
              }
            }
          })
        })

        /* Bind Delete */
        $document.on('click', 'button.delete-step', e => {
          let stepId = e.currentTarget.parentNode.parentNode.dataset.id
          this.deleteStep(stepId)
        })

        $document.on('click', 'button.lock-step', e => {
          let stepId = e.currentTarget.parentNode.parentNode.dataset.id
          this.lockStep(stepId)
        })

        $document.on('click', 'button.unlock-step', e => {
          let stepId = e.currentTarget.parentNode.parentNode.dataset.id
          this.unlockStep(stepId)
        })

        /* Bind Duplicate */
        $document.on('click', 'button.duplicate-step', e => {
          let stepId = e.currentTarget.parentNode.parentNode.dataset.id
          this.duplicateStep(stepId)
        })

        /* Activate Spinner */
        $form.on('submit', function (e) {
          e.preventDefault()
          return false
        })

        $form.on('change', e => {
          if (e.target.matches('textarea[name=step_notes]')) {
            this.updateStepMeta({
              step_notes: e.target.value,
            })
            return
          }

          this.saveQuietly({
            shouldMorphSettings: !e.target.matches('.no-morph'),
          })
        })

        $('#gh-legacy-modal-save-changes').on('click', () => {
          this.saveQuietly()
        })

        // Funnel Title
        $document.on('click', '.title-view .title', function (e) {
          $('.title-view').hide()
          $('.title-edit').show().removeClass('hidden')
          $('#title').focus()
        })

        $document.on('blur change', '#title', function (e) {

          let title = $(this).val()

          $('.title-view').find('.title').text(title)
          $('.title-view').show()
          $('.title-edit').hide()
        })

        $('#funnel-deactivate').on('click', e => {
          dangerConfirmationModal({
            alert      : `<p><b>Are you sure you want to deactivate the flow?</b></p>
<p>Any pending events will be paused. They will be resumed immediately when the flow is reactivated.</p>
<p>Unsaved changes will be discarded. To preserve any changes, update the flow first, then deactivate.</p>`,
            confirmText: __('Deactivate'),
            onConfirm  : () => {
              this.save({
                quiet   : false,
                moreData: formData => formData.append('_deactivate', true),
              })
            },
          })
        })

        $('#funnel-update').on('click', e => {

          const update = () => this.save({
            quiet   : false,
            moreData: formData => formData.append('_commit', true),
          })

          // errors
          if (document.getElementById('step-flow').querySelector('.has-errors')) {

            dangerConfirmationModal({
              // language=HTML
              alert      : `<p><b>Some of your steps have issues!</b></p>
              <p>Review steps with the ⚠️ icon before updating.</p>
              <p>Are you sure you want to commit your changes?</p>`,
              onConfirm  : update,
              confirmText: 'Update anyway',
            })

            return
          }

          update()
        })

        $('#funnel-activate').on('click', e => {

          const activate = () => this.save({
            quiet   : false,
            moreData: formData => formData.append('_activate', true),
          })

          // errors
          if (document.getElementById('step-flow').querySelector('.has-errors')) {

            dangerConfirmationModal({
              // language=HTML
              alert      : `<p><b>Some of your steps have issues!</b></p>
              <p>Review steps with the ⚠️ icon before activating.</p>
              <p>Are you sure you want to activate with issues present?</p>`,
              onConfirm  : activate,
              confirmText: 'Activate anyway',
            })

            return
          }

          activate()
        })

        $('#funnel-simulate').on('click', e => {
          window.location.hash = 'simulator'
        })

        $('#funnel-settings').on('click', e => {
          window.location.hash = 'settings'
        })

        if (window.innerWidth > 600) {
          this.makeSortable()
        }

        morphSettings()

        this.handleHashChange = this.handleHashChange.bind(this)
        window.addEventListener('hashchange', this.handleHashChange)
        this.handleHashChange()

        let header = document.querySelector('.funnel-editor-header > .actions')

        header.append(Button({
          id       : 'funnel-more',
          className: 'gh-button secondary text icon',
          onClick  : e => {
            moreMenu('#funnel-more', [
              {
                key     : 'settings',
                text    : 'Settings',
                onSelect: e => {
                  window.location.hash = 'settings'
                },
              },
              {
                key     : 'export',
                text    : 'Export',
                onSelect: e => {
                  window.open(Funnel.export_url, '_blank')
                },
              },
              {
                key     : 'share',
                text    : 'Share',
                onSelect: e => {
                  prompt('Copy this link to share', Funnel.export_url)
                },
              },
              {
                key     : 'reports',
                text    : 'Reports',
                onSelect: e => {
                  window.open(adminPageURL('gh_reporting', {
                    tab   : 'funnels',
                    funnel: Funnel.id,
                  }), '_blank')
                },
              },
              {
                key     : 'contacts',
                text    : 'Add Contacts',
                onSelect: e => {
                  modal({
                    //language=HTML
                    content: `<h2>${ __('Add contacts to this flow', 'groundhogg') }</h2>
                    <div id="gh-add-to-funnel" style="width: 500px"></div>`,
                    onOpen : () => {
                      document.getElementById('gh-add-to-funnel').append(Groundhogg.FunnelScheduler({
                        funnel    : getFunnel(),
                        funnelStep: getFunnel().steps[0],
                      }))
                    },
                  })
                },
              },
              {
                key     : 'screenshot-mode',
                text    : document.body.classList.contains('gh-screenshot-mode') ? 'Editing Mode' : 'Screenshot Mode',
                onSelect: e => {
                  document.body.classList.toggle('gh-screenshot-mode')
                  drawLogicLines()
                },
              },
              {
                key     : 'fullscreen',
                text    : document.body.classList.contains('gh-full-screen') ? 'Exit Fullscreen' : 'Fullscreen',
                onSelect: e => {
                  document.body.classList.toggle('gh-full-screen')
                  ajax({
                    action     : 'gh_funnel_editor_full_screen_preference',
                    full_screen: document.body.classList.contains('gh-full-screen') ? 1 : 0,
                  })
                },
              },
              {
                key     : 'shortcuts',
                text    : 'Keyboard Shortcuts',
                onSelect: e => {

                  const shortcuts = [
                    [
                      'Copy a step',
                      [
                        'CTRL',
                        'C',
                      ],
                    ],
                    [
                      'Paste a copied step',
                      [
                        'CTRL',
                        'V',
                      ],
                    ],
                    [
                      'Move a step',
                      [
                        'CTRL',
                        'M',
                      ],
                    ],
                    // [ 'Undo', [ 'CTRL', 'Z' ] ],
                    // [ 'Redo', [ 'CTRL', 'Shift', 'Z' ] ],
                  ]

                  MakeEl.ModalWithHeader({
                      width : '500px',
                      header: 'Keyboard Shortcuts',
                    },
                    Div({ className: 'display-flex column' }, shortcuts.map(([desc, keys]) => Div({ className: 'space-between' }, [
                      MakeEl.Pg({}, desc),
                      MakeEl.Pg({}, keys.map(key => `<code>${ key }</code>`).join(' + ')),
                    ]))),
                  )
                },
              },
              {
                key     : 'feedback',
                text    : 'Feedback',
                onSelect: e => {
                  Groundhogg.components.FeedbackModal({
                    subject: 'Flow editor',
                  })
                },
              },
              {
                key     : 'uncommit',
                text    : '<span class="gh-text danger">Revert Changes</span>',
                onSelect: e => {
                  dangerConfirmationModal({
                    alert    : '<p>Are you sure you want to revert your changes?</p><p>Your flow will be restored to the most recent save point.</p>',
                    onConfirm: () => {
                      this.save({
                        moreData: formData => {
                          formData.append('_uncommit', 1)
                        },
                      })
                    },
                  })
                },
              },
            ])
          },
        }, icons.verticalDots))

        $('#step-settings-container').resizable({
          handles        : 'w',
          animateDuration: 'fast',
          resize         : function (event, ui) {
            ui.element.css('left', '') // Remove the 'left' style to keep the div in place
            localStorage.setItem('gh-funnel-settings-panel-width', ui.size.width)
          },
        })

        setInterval(() => this.updateLastSaved(), 10 * 1000)

        // add initial state to history
        this.addCurrentStepsToUndoRedoHistory()

        syncReplacementCodes()
      },

      addCurrentStepsToUndoRedoHistory () {
        // only minimum data, don't need export stuff
        UndoRedoManager.addChange(JSON.stringify(this.steps.map(({
          ID,
          data,
          meta,
        }) => ( {
          ID,
          data,
          meta,
        } ))))
      },

      updateLastSaved () {

        if (this.lastSaved === null) {
          return
        }

        document.getElementById('last-saved-text').innerHTML = `Changes saved ${ wp.date.humanTimeDiff(this.lastSaved, new Date()) }.`
      },

      async save (args = {}) {

        if (args === true) {
          args = {
            quiet: true,
          }
        }

        let {
          quiet = true,
          moreData = () => {},
          restore = '',
          shouldMorphSettings = true,
        } = args

        if (quiet && this.saving) {
          this.saveQuietly(args) // this will debounce until it works
          return
        }

        this.saving = true

        // let's make sure all the branch info is correct!
        this.updateBranches()

        let formData = new FormData(document.getElementById('funnel-form'))

        // these are in the form but are not actually used when posted
        formData.delete('step_notes')
        formData.delete('note_text')

        formData.append('action', 'gh_save_funnel_via_ajax')

        if (!quiet) {
          $('body').addClass('saving')
          UndoRedoManager.clear() // reset undo states
        }
        else {
          $('body').addClass('auto-saving')
        }

        // Update the JS meta changes first
        if (Object.keys(this.metaUpdates).length) {
          formData.append('metaUpdates', JSON.stringify(this.metaUpdates))
          this.metaUpdates = {} // clear the meta updates only after update was confirmed...
        }

        // add additional data to the formData if required
        if (moreData) {
          moreData(formData)
        }

        if (restore) {
          let restoreFormData = new FormData()
          restoreFormData.append('_restore', restore)
          let inputs = [
            'funnel',
            'action',
            '_wpnonce',
            '_wp_http_referer',
          ]
          inputs.forEach(input => {
            restoreFormData.append(input, formData.get(input))
          })
          formData = restoreFormData
        }

        return await ajax(formData, {
          url: `${ ajaxurl }?${ quiet ? 'auto-save' : 'explicit-save' }=1`,
        }).then(response => {

          // make sure the status is available to the parent funnel form element
          document.getElementById('funnel-form').dataset.status = response.data.funnel.data.status

          this.steps = response.data.funnel.steps

          if (!restore) {
            this.addCurrentStepsToUndoRedoHistory()
          }

          if (!this.dragging) {
            morphdom(document.getElementById('step-sortable'), Div({}, response.data.sortable), {
              childrenOnly     : true,
              onBeforeElUpdated: function (fromEl, toEl) {

                // preserve the editing class
                if (fromEl.classList.contains('editing')) {
                  toEl.classList.add('editing')
                }

                return true
              },
            })

            this.makeSortable()
          }

          if (shouldMorphSettings) {
            morphdom(document.querySelector('.step-settings'), Div({}, response.data.settings), {
              childrenOnly     : true,
              onBeforeElUpdated: function (fromEl, toEl) {

                if (fromEl.tagName === 'TEXTAREA' && toEl.tagName === 'TEXTAREA') {
                  toEl.style.height = fromEl.style.height
                }

                // preserve the editing class
                if (fromEl.classList.contains('editing')) {
                  toEl.classList.add('editing')
                }

                if (quiet && !restore && fromEl.matches('.editing .ignore-morph')) {
                  return false // don't morph the currently edited step to avoid glitchiness
                }

                return true
              },

            })
          }

          // self.makeSortable()
          drawLogicLines()

          this.saving = false

          this.lastSaved = new Date()
          this.updateLastSaved()

          // quietly!
          if (quiet) {
            $(document).trigger('auto-save')
            $(document).trigger('gh-init-pickers') // re-init pickers that would have been removed
            $('body').removeClass('auto-saving')

            if (restore) {
              this.stepSettingsCallbacks()
            }

            // re-enable publish button
            document.getElementById('funnel-update').disabled = false

            return response
          }

          // disable publish button, changes are published
          document.getElementById('funnel-update').disabled = true

          $(document).trigger('saved')

          this.stepSettingsCallbacks()

          $('body').removeClass('saving')

          if (response.data.err) {
            dialog({
              message: response.data.err,
              type   : 'error',
            })
            return response
          }

          dialog({
            message: __('Flow saved!', 'groundhogg'),
          })
        }).catch(err => {
          dialog({
            message: __('Something went wrong updating the flow. Your changes could not be saved.', 'groundhogg'),
            type   : 'error',
          })
          throw err
        })
      },

      saveQuietly: Groundhogg.functions.debounce((args = {}) => Funnel.save({ quiet: true, ...args }), 750),

      updateBranches () {
        document.querySelectorAll(`input[name*="[branch]"][type="hidden"]`).forEach(input => {
          input.value = input.closest('.step-branch').dataset.branch
        })
      },

      makeSortable () {
        this.sortables = $('.step-branch').sortable({
          placeholder: 'sortable-placeholder',
          connectWith: '.step-branch',
          // handle: '.step',
          // tolerance: 'pointer',
          cancel  : '.locked',
          distance: 100,
          cursorAt: {
            left: 5,
            top : 5,
          },
          helper  : (e, $el) => {

            let $step = $el.is('.step') ? $el : $el.find('.step')
            let icon = $el.find('.hndle-icon')[0]

            // language=HTML
            return `
                <div class="sortable-helper-icon ${ $step.data('group') }">
                    <div class="step-icon">
                        ${ icon.outerHTML }
                    </div>
                </div>`
          },
          change  : () => drawLogicLines(),
          // sort    : () => drawLogicLines(),
          stop   : () => {

            // update the branch hidden fields to be correct with their parent
            this.dragging = false
            this.saveQuietly()
            drawLogicLines()

          },
          start  : (e, ui) => {
            ui.helper.width(60)
            ui.helper.height(60)
            drawLogicLines()
            this.dragging = true
          },
          receive: (e, ui) => {

            drawLogicLines()

            // receiving from another sortable?
            if (ui.helper === null) {
              return
            }

            let branch = ui.helper.closest('.step-branch').data('branch')
            let type = ui.helper.data('type')
            let group = ui.helper.data('group')

            if (!type) {
              ui.helper.remove() // discard right away
              return
            }

            let data = {
              step_type : type,
              step_group: group,
              branch    : branch,
            }

            let placeholder = createPlaceholderEl(data)

            // language=HTML
            ui.helper.replaceWith(placeholder)

            this.save({
              quiet: true,
            })
          },
        })

        this.sortables.disableSelection()

        $('.step-element.step-draggable').draggable({
          connectToSortable: '.step-branch',
          cancel           : '.premium',
          distance         : 100,
          stop             : () => {
            drawLogicLines()
          },
          helper           : (e) => {

            let $el = $(e.currentTarget)
            let icon = $el.find('.step-icon')[0]

            // language=HTML
            return `
                <div class="sortable-helper-icon ${ $el.data('group') }" data-group="${ $el.data('group') }" data-type="${ $el.attr('id') }">
                    ${ icon.outerHTML }
                </div>`
          },
        })
      },

      hideSettings () {
        $('#step-settings-container').removeAttr('style').addClass('slide-out')
        setTimeout(() => {
          document.dispatchEvent(new Event('resize'))
        }, 400)
      },

      showSettings () {
        $('#step-settings-container').css('width', localStorage.getItem('gh-funnel-settings-panel-width')).removeClass('slide-out')
        setTimeout(() => {
          document.dispatchEvent(new Event('resize'))
        }, 400)
      },

      showAddStep () {
        this.showSettings()
        this.startEditing(null)
      },

      showSimulator () {

        if (!this.steps.length) {
          Groundhogg.element.errorDialog({
            message: 'You must add steps to the flow first.',
          })
          return
        }

        this.showSettings()
        Groundhogg.simulator.state.set({
          current: this.editing ? parseInt(this.editing) : this.steps[0].ID,
        })
        this.startEditing(null)
        Groundhogg.simulator.morph()
      },

      /**
       * Given an element delete it
       *
       * @param id int
       */
      deleteStep: function (id) {

        let step = document.getElementById(`step-${ id }`)
        let $step = $(step)
        let sortable = getSortableEl(step)
        let $sortable = $(sortable)

        const deleteStep = () => {
          if (this.isEditing(id)) {
            this.startEditing(null)
          }

          $sortable.fadeOut(400, () => {
            $sortable.remove()
            drawLogicLines()
            this.save({
              quiet   : true,
              moreData: formData => {
                formData.append('_delete_step', id)
              },
            })
          })
        }

        // deleting the branch will delete inner steps
        if ($sortable.is('.branch-logic') && $sortable.find('.step-branch .step').length > 0) {
          dangerConfirmationModal({
            alert    : '<p>Are you sure you want to delete this step? Any steps in branches will also be deleted.</p>',
            onConfirm: () => deleteStep(),
          })
          return
        }

        // deleting the benchmark will also delete inner steps
        if ($sortable.is('.benchmark') && $sortable.find('.step-branch .step').length > 0) {
          dangerConfirmationModal({
            alert    : '<p>Are you sure you want to delete this trigger? Any sub steps will also be deleted.</p>',
            onConfirm: () => deleteStep(),
          })
          return
        }

        deleteStep()
      },

      /**
       * Given an element delete it
       *
       * @param id int
       */
      lockStep: function (id) {
        this.save({
          quiet   : true,
          moreData: formData => {
            formData.append('_lock_step', id)
          },
        })
      },

      /**
       * Given an element delete it
       *
       * @param id int
       */
      unlockStep: function (id) {
        this.save({
          quiet   : true,
          moreData: formData => {
            formData.append('_unlock_step', id)
          },
        })
      },

      /**
       * Given an element, duplicate the step and
       * Add it to the funnel
       *
       * @param id int
       */
      async duplicateStep (id) {

        const step = this.steps.find(s => s.ID == id)

        if (!step) {
          return
        }

        const type = step.data.step_type
        let extra = {}

        let stepEl = document.getElementById(`step-${ step.ID }`)
        let sortable = stepEl.closest('.sortable-item')

        // it's a benchmark that might have inner steps
        if (sortable.querySelector(`.step-branch:has(.step)`)) {

          extra = await new Promise((res, rej) => {

            confirmationModal({
              alert      : `<p>${ __('Do you also want to duplicate the sub steps as well?', 'groundhogg') }</p>`,
              confirmText: __('Yes, duplicate all sub steps!', 'groundhogg'),
              closeText  : __('No, just this step.', 'groundhogg'),
              onConfirm  : () => res({}),
              onCancel   : () => res({
                __ignore_inner: true,
              }),
            })

          })

        }

        if (this.stepCallbacks.hasOwnProperty(type) && this.stepCallbacks[type].hasOwnProperty('onDuplicate')) {
          let _extra = await new Promise((res, rej) => this.stepCallbacks[type].onDuplicate(step, res, rej))
          extra = {
            ...extra,
            ..._extra,
          }
        }

        sortable.insertAdjacentElement('afterend', createPlaceholderEl({
          duplicate : step.ID,
          step_type : step.data.step_type,
          step_group: step.data.step_group,
        }))

        drawLogicLines()

        return await this.save({
          quiet   : true,
          moreData: formData => {

            Object.keys(extra).forEach(key => {
              formData.append(key, extra[key])
            })

          },
        })

      },

      getStep (id) {
        return this.steps.find(s => s.ID == id)
      },

      /**
       * The step that is currently being edited.
       *
       * @returns {unknown}
       */
      getActiveStep () {
        return this.getStep(this.editing)
      },

      metaUpdates: {},

      updateStepMeta (_meta, stepId = false) {

        let step

        if (stepId) {
          step = this.steps.find(s => s.ID == stepId)
        }
        else {
          step = this.getActiveStep()
        }

        step.meta = {
          ...step.meta,
          ..._meta,
        }

        this.metaUpdates[step.ID] = {
          ...this.metaUpdates[step.ID],
          ..._meta,
        }

        this.saveQuietly()

        return step
      },

      isEditing (id) {
        return this.editing == id
      },

      clearAddEl () {
        if (this.addEl) {
          this.addEl.classList.remove('here')
        }
        this.addEl = null
      },

      /**
       * Make the given step active.
       *
       * @param id string
       * @param hps bool what to do with the browser history
       */
      startEditing (id, hps = false) {

        // trying to make the current step active
        if (this.editing === id) {
          return
        }

        // this step is not in the funnel
        if (id && !this.steps.find(s => s.ID == id)) {
          return
        }

        // deactivate the current step
        if (this.editing) {
          try {
            document.getElementById(`step-${ this.editing }`).classList.remove('editing')
            document.getElementById(`settings-${ this.editing }`).classList.remove('editing')
          }
          catch (err) {

          }
        }

        this.editing = id

        // we are indeed making a different step active
        if (this.editing) {

          this.clearAddEl()

          document.getElementById(`step-${ this.editing }`).classList.add('editing')
          document.getElementById(`settings-${ this.editing }`).classList.add('editing')

          this.stepSettingsCallbacks()

          setTimeout(() => {
            scrollIntoViewIfNeeded(document.getElementById(`step-${ this.editing }`), document.querySelector(`.fixed-inside`))
          }, 300)
        }
      },

      stepSettingsCallbacks () {
        const step = this.getActiveStep()

        if (!step) {
          return
        }

        const type = step.data.step_type

        if (this.stepCallbacks.hasOwnProperty(type) && this.stepCallbacks[type].hasOwnProperty('onActive')) {
          this.stepCallbacks[type].onActive({
            ...step,
            updateStep: meta => this.updateStepMeta(meta, step.ID),
          })
        }

        $(document).trigger('gh-init-pickers')
        $(document).trigger('step-active')
      },

      startTour () {

        Groundhogg.components.Tour([
          {
            prompt  : `This is step flow. Your flows are made up of a series of steps. Steps can be <span class="gh-text orange">triggers</span>, <span class="gh-text green">actions</span>, or <span class="gh-text purple">logic</span>.`,
            position: 'right',
            target  : '#step-sortable',
            onInit  : ({
              target,
            }) => {
              target.click()
            },
          },
          {
            prompt  : '👈 Click on any ➕ icon to start adding new steps to a flow. Once clicked the icon will become highlighted and new steps can be added at that position.',
            position: 'right',
            target  : 'button.add-step',
            onInit  : ({
              target,
            }) => {
              target.click()
            },
          },
          {
            prompt  : 'Filter the various types by using the group filters.',
            position: 'below',
            target  : '.steps-select .gh-input-group.full-width',
          },
          {
            prompt  : `<span class="gh-text orange">Triggers</span> (Goals/Benchmarks) are used to start flows and move contacts through flows when they meet the configured criteria.`,
            position: 'below',
            target  : 'button.step-filter[data-group="benchmark"]',
            onBefore: ({ target }) => target.click(),
          },
          {
            prompt  : `<span class="gh-text green">Actions</span> are used to communicate with the contact and provide your customer experience.`,
            position: 'below',
            target  : 'button.step-filter[data-group="action"]',
            onBefore: ({ target }) => target.click(),
          },
          {
            prompt  : `<span class="gh-text purple">Logic</span> steps are used to provide a different experience to contacts based on their attributes and history.`,
            position: 'below',
            target  : 'button.step-filter[data-group="logic"]',
            onBefore: ({ target }) => target.click(),
          },
          {
            prompt  : 'You can also search for steps using keywords.',
            position: 'left',
            target  : '.step-search-wrap',
          },
          {
            prompt  : 'Click on a type to add it to the flow at the highlighted position 👇',
            position: 'above',
            target  : '.steps-grid',
            onBefore: () => {
              document.querySelector('button.step-filter[data-group="benchmark"]').click()
            },
          },
          {
            prompt  : `Let's add a <span class="gh-text orange">Tag Applied</span> trigger to the flow now by clicking on the icon.`,
            position: 'right',
            target  : '#tag_applied',
            onBefore: ({ target }) => {
              document.querySelector('button.step-filter[data-group="benchmark"]').click()
              target.click()
            },
          },
          {
            prompt  : '👈 Click on a step in the flow to show its settings.',
            position: 'right',
            target  : '#step-flow .step.apply_tag',
            onInit  : ({ target }) => {
              target.click()
            },
          },
          {
            prompt  : '👆 You will configure the step settings from here.',
            position: 'below',
            target  : '.settings.editing .main-step-settings-panel',
          },
          {
            prompt  : 'Some context specific settings will appear here, as well as the notes area for your personal usage.',
            position: 'left',
            target  : '.settings.editing .step-notes',
          },
          {
            prompt  : `You can start a flow with more than one <span class="gh-text orange">trigger</span> by adding a new trigger adjacent to an existing one.`,
            position: 'left',
            target  : '.add-step.add-benchmark',
            onInit  : ({ target }) => target.click(),
          },
          {
            prompt  : `Let's add a new <span class="gh-text orange">User Created</span> trigger.`,
            position: 'right',
            target  : '#account_created',
            onInit  : ({ target }) => target.click(),
          },
          {
            prompt  : `Now the flow will start when a tag is applied <span class="gh-text purple">or</span> when a user is created!`,
            position: 'right',
            target  : '.step-branch.benchmarks',
            onBefore: () => this.hideSettings(),
          },
          {
            prompt  : `<span class="gh-text orange">Triggers</span> have their own sub-flows that are not part of the main flow. Only contacts that completed the <span class="gh-text orange">trigger</span> can run through these steps.`,
            position: 'left',
            target  : '.step.benchmark + .step-branch',
            onBefore: ({}) => {
              this.hideSettings()
            },
          },
          {
            prompt  : `Click on the ➕ icon to add an action to the sub-flow.`,
            position: 'right',
            target  : '.step.benchmark + .step-branch .add-step',
            onInit  : ({ target }) => target.click(),
          },
          {
            prompt  : `Let's add a new <span class="gh-text green">Delay Timer</span> action to the sub flow.`,
            position: 'right',
            target  : '#delay_timer',
            onInit  : ({ target }) => target.click(),
          },
          {
            prompt  : `Now, only contacts that completed the <span class="gh-text orange">Tag Applied</span> trigger will wait at the <span class="gh-text green">Delay Timer</span>.`,
            position: 'right',
            target  : '.step-branch.benchmarks .step.delay_timer',
            onInit  : ({ target }) => this.hideSettings(),
          },
          {
            prompt  : 'Click here to add a new step to the main flow. Steps here will run for anyone in the flow, regardless of where they entered.',
            position: 'above',
            target  : '.add-step#end-funnel',
            onInit  : ({ target }) => target.click(),
          },
          {
            prompt  : `Let's add a new <span class="gh-text purple">Logic</span> step to send different emails based on a contact's tags.`,
            position: 'right',
            target  : '#if_else',
            onBefore: ({ target }) => {
              document.querySelector('button.step-filter[data-group="logic"]').click()
              target.click()
            },
          },
          {
            prompt  : `Click on the ➕ icon within a logic branch to add steps to it.`,
            position: 'right',
            target  : '#step-flow .branch-logic .split-branch.green .step-branch .add-step',
            onInit  : ({ target }) => target.click(),
          },
          {
            prompt  : `Let's add a new <span class="gh-text green">Send Email</span> action to the <span class="gh-text green">Yes</span> branch.`,
            position: 'left',
            target  : '#send_email',
            onBefore: () => {
              document.querySelector('button.step-filter[data-group="action"]').click()
            },
            onInit  : ({ target }) => {
              target.click()
            },
          },
          {
            prompt  : `We want to send a different email if the contact does not meet our conditions, so click on the ➕ in the No branch.`,
            position: 'right',
            target  : '#step-flow .branch-logic .split-branch.red .step-branch .add-step',
            onInit  : ({ target }) => target.click(),
          },
          {
            prompt  : `Let's add a new <span class="gh-text green">Send Email</span> action to the <span class="gh-text red">No</span> branch as well.`,
            position: 'left',
            target  : '#send_email',
            onBefore: () => {
              document.querySelector('button.step-filter[data-group="action"]').click()
            },
            onInit  : ({ target }) => {
              target.click()
            },
          },
          {
            prompt  : `Let's configure the logic condition so that the right contacts get the right email`,
            position: 'right',
            target  : '#step-flow .step.if_else',
            onInit  : ({ target }) => {
              target.click()
            },
          },
          {
            prompt  : `Use powerful <span class="gh-text purple">filters</span> to send contacts down the different branches. Contacts that match the filters will go down the <span class="gh-text green">Yes</span> branch, otherwise the <span class="gh-text red">No</span> branch.`,
            position: 'below',
            target  : '.settings.editing .custom-settings',
          },
          {
            prompt  : `Let's add another <span class="gh-text orange">trigger</span> that will end the flow.`,
            position: 'above',
            target  : '.add-step#end-funnel',
            onInit  : ({ target }) => {
              target.click()
              document.querySelector('button.step-filter[data-group="benchmark"]').click()
            },
          },
          {
            prompt  : `Let's end the flow with a <span class="gh-text orange">Tag Removed</span> trigger.`,
            position: 'right',
            target  : '#tag_removed',
            onInit  : ({ target }) => target.click(),
          },
          {
            prompt  : `Now if a tag is removed from the contact at any time, they will jump here, ending the flow.`,
            position: 'above',
            target  : '#step-flow .step.tag_removed',
            onBefore: ({ target }) => {
              setTimeout(() => {
                target.focus().scrollIntoView({
                  behavior: 'smooth',
                  block   : 'center',
                  inline  : 'center',
                })
              }, 250)
            },
            onInit  : () => {
              this.hideSettings()
            },
          },
          {
            prompt  : `When you've configured all the steps in your flow, turn it on by clicking <span class="gh-text green">Activate</span>!`,
            position: 'below-left',
            target  : '#funnel-activate',
          },
        ], {
          fixed        : true,
          onFinish     : () => {
            dialog({
              message: '🎉 Tour complete!',
            })
            return ajax({
              action: 'gh_dismiss_notice',
              notice: 'funnel-tour',
            })
          },
          beforeDismiss: ({ dismiss }) => {
            confirmationModal({
              alert    : `<p>Are you sure you want to exit the tour?</p>`,
              onConfirm: () => {
                dismiss()
                return ajax({
                  action: 'gh_dismiss_notice',
                  notice: 'funnel-tour',
                }).then(() => true)
              },
            })
          },
        })
      },
    })

    $(function () {
      drawLogicLines()
      Funnel.init().then(() => {

        // if tour is dismissed, do regular stuff
        if (Funnel.funnelTourDismissed) {

          const url = new URL(window.location)

          // do title prompt if prompted...
          const hasFromAdd = url.searchParams.get('from') === 'add'

          if (hasFromAdd) {

            // remove from url so reloads don't re-prompt
            url.searchParams.delete('from')
            window.history.replaceState({}, '', url)

            // Prompt to rename the funnel
            MakeEl.ModalWithHeader({
              header: 'Name your flow',
              onOpen: () => {
                let input = document.getElementById('prompt-funnel-title')
                input.focus()
                input.select()
              },
            }, ({ close }) => MakeEl.Form({
              onSubmit: e => {
                e.preventDefault()
                let fd = new FormData(e.currentTarget)
                let title = fd.get('funnel_title')

                $('.title-view').find('.title').text(title)
                $('#title').val(title)
                Funnel.saveQuietly()
                close()
              },
            }, [
              Div({
                className: 'display-flex gap-5',
              }, [
                Input({
                  id   : 'prompt-funnel-title',
                  name : 'funnel_title',
                  value: Funnel.data.title,
                }),
                Button({
                  className: 'gh-button primary',
                  type     : 'submit',
                }, 'Save'),
              ]),
            ]))

          }

          return
        }

        if (Funnel.steps.length > 0) {
          // existing funnel, ask if they want the new tour
          confirmationModal({
            alert      : `<p>👋 Funnels are now <b>Flows</b> and have changed <b>a lot</b> in 4.0!</p><p>Would you like a tour of the new features?</p>`,
            confirmText: 'Start tour!',
            closeText  : 'No thanks',
            onConfirm  : () => {
              localStorage.setItem('gh-force-tour', 'yes')
              // open a new scratch funnel to start the tour
              window.open(Funnel.scratchFunnelURL, '_self')
            },
            onCancel   : () => {
              return ajax({
                action: 'gh_dismiss_notice',
                notice: 'funnel-tour',
              })
            },
          })
          return
        }

        // tour is forced
        if (localStorage.getItem('gh-force-tour') === 'yes') {
          localStorage.removeItem('gh-force-tour') // clear from local storage
          Funnel.startTour()
          return
        }

        // this is a scratch funnel, lets ask if they want to tour
        confirmationModal({
          alert      : `<p>👋 Flows allow you to automate the customer journey. Would you like a tour?</p>`,
          confirmText: 'Start tour!',
          closeText  : 'No thanks',
          onConfirm  : () => {
            Funnel.startTour()
          },
          onCancel   : () => {
            return ajax({
              action: 'gh_dismiss_notice',
              notice: 'funnel-tour',
            })
          },
        })
      })
    })

    window.addEventListener('beforeunload', e => {

      if (Object.keys(Funnel.metaUpdates).length) {
        e.preventDefault()
        let msg = __('You have unsaved changes, are you sure you want to leave?', 'groundhogg')
        e.returnValue = msg
        return msg
      }

      return null
    })
  }

  function areNumbersClose (num1, num2, tolerancePercent) {
    const average = ( Math.abs(num1) + Math.abs(num2) ) / 2
    const tolerance = ( tolerancePercent / 100 ) * average
    return Math.abs(num1 - num2) <= tolerance
  }

  const getSortableEl = el => {
    if (el.matches('.sortable-item')) {
      return el
    }

    return el.closest('.sortable-item')
  }

  function findWidestElementBetween (startElement, endElement) {

    startElement = getSortableEl(startElement)
    endElement = getSortableEl(endElement)

    let el = startElement
    let currEl = startElement.nextElementSibling

    while (currEl) {

      if (el.getBoundingClientRect().width < currEl.getBoundingClientRect().width) {
        el = currEl
      }

      if (currEl.isSameNode(endElement)) {
        break
      }

      currEl = currEl.nextElementSibling
    }

    return el
  }

  function getClosestScrollingAncestor (element) {
    let parent = element.parentElement

    while (parent) {
      const style = window.getComputedStyle(parent)
      const overflowY = style.overflowY
      const isScrollable = ( overflowY === 'auto' || overflowY === 'scroll' ) && parent.scrollHeight > parent.clientHeight

      if (isScrollable) {
        return parent // Found the closest scrollable ancestor
      }

      parent = parent.parentElement
    }

    return document.documentElement // Defaults to <html> if no scrollable ancestor is found
  }

  function scrollIntoViewIfNeeded (element, container) {

    if (!element) {
      return
    }

    if (!container) {
      container = getClosestScrollingAncestor(element)
    } // Default to parent if no container is provided

    const elementRect = element.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    const isVisibleVertically =
      elementRect.top >= containerRect.top &&
      elementRect.bottom <= containerRect.bottom

    const isVisibleHorizontally =
      elementRect.left >= containerRect.left &&
      elementRect.right <= containerRect.right

    if (!isVisibleVertically || !isVisibleHorizontally) {
      element.scrollIntoView({
        behavior: 'smooth',
        block   : isVisibleVertically ? 'nearest' : 'center',
        inline  : isVisibleHorizontally ? 'nearest' : 'center',
      })
    }
  }

  let lineWidth

  function drawLogicLines () {

    // const borderRadius = '50px'
    const borderRadius = 'var(--logic-line-radius)'
    const borderWidth = `var(--logic-line-width)`

    if (!lineWidth) {
      lineWidth = parseInt(window.getComputedStyle(document.getElementById('step-flow')).getPropertyValue('--logic-line-width'))
    }
    let offset = lineWidth / 2

    const clearLineStyle = line => line.removeAttribute('style')

    let main = document.querySelector(`.step-branch[data-branch='main']`)
    let end = main.querySelector('div.funnel-end')

    if (!end) {
      end = MakeEl.Fragment([
        document.body.classList.contains('gh_funnels') ? Button({
          className: `add-step ${ Funnel.steps.length ? 'add-action' : 'add-benchmark' }`,
          id       : 'end-funnel',
        }, MakeEl.Dashicon('plus-alt2')) : null,
        Div({ className: 'flow-line' }),
        Div({ className: 'funnel-end' }, Span({ className: 'the-end' }, 'End')),
      ])
    }

    main.append(end)

    // Benchmark Groups
    try {
      document.querySelectorAll('.step-branch.benchmarks').forEach(el => {

        // already there
        if (el.previousElementSibling && el.previousElementSibling.matches('.benchmark-pill')) {
          return
        }

        let insert

        if (el.parentElement.matches('.starting')) {
          insert = Div({ className: 'benchmark-pill ' }, [
            'Start the flow when...',
          ])
        }
        else {
          insert = Div({ className: 'benchmark-pill' }, [
            'Until...',
            ToolTip('Contacts will be <i>pulled</i> here, skipping all actions, when any <span class="gh-text orange">trigger</span> is completed.',
              'right'),
          ])

          el.insertAdjacentElement('beforebegin', Div({ className: 'flow-stop' }))
        }
        el.insertAdjacentElement('beforebegin', insert)
      })

    }
    catch (err) {

    }

    // Benchmarks
    try {

      document.querySelectorAll('.logic-line.benchmark-line').forEach(el => el.remove())
      document.querySelectorAll('.step-branch.benchmarks > .sortable-item').forEach(el => {

        // the step-branch.benchmarks container
        let rowPos = el.parentElement.getBoundingClientRect()

        // the benchmark itself
        let step = el

        let stepPos = step.getBoundingClientRect()

        let stepCenter = stepPos.left + stepPos.width / 2
        let rowCenter = rowPos.left + rowPos.width / 2

        let line1 = Div({ className: `logic-line benchmark-line line-${ step.id }-1` })
        step.parentElement.append(line1)

        let line2 = Div({ className: `logic-line benchmark-line line-${ step.id }-2` })
        step.parentElement.append(line2)

        if (step.style.display === 'none') {
          line1.remove()
          line2.remove()
          return
        }

        clearLineStyle(line1)
        clearLineStyle(line2)

        let lineWidth = Math.abs(rowCenter - stepCenter) / 2
        let lineHeight = Math.abs(rowPos.bottom - stepPos.bottom) / 2

        line1.style.bottom = `${ Math.abs(stepPos.bottom - rowPos.bottom) - lineHeight }px`
        line2.style.bottom = `${ Math.abs(stepPos.bottom - rowPos.bottom) - ( lineHeight * 2 ) }px`
        line1.style.width = `${ lineWidth }px`
        line1.style.height = `${ lineHeight }px`
        line2.style.width = `${ lineWidth }px`
        line2.style.height = `${ lineHeight }px`

        // center
        if (areNumbersClose(stepCenter, rowCenter, 1)) {
          line1.style.left = `calc(50% - ${ offset }px)`
          line1.style.width = 0
          line1.style.bottom = 0
          line1.style.height = `${ lineHeight * 2 }px`
          line1.style.borderWidth = `0 0 0 ${ borderWidth }`
          line2.style.display = 'none'
        }
        // left side
        else if (stepCenter < rowCenter) {
          line1.style.left = `${ stepCenter - rowPos.left - offset }px`
          line1.style.borderWidth = `0 0 ${ borderWidth } ${ borderWidth }`
          line1.style.borderRadius = `0 0 0 ${ borderRadius }`

          line2.style.left = `${ stepCenter - rowPos.left + lineWidth - offset }px`
          line2.style.borderWidth = `${ borderWidth } ${ borderWidth } 0 0`
          line2.style.borderRadius = `0 ${ borderRadius } 0 0`
        }
        // right side
        else {
          line1.style.left = `${ stepCenter - rowPos.left - lineWidth - offset }px`
          line1.style.borderWidth = `0 ${ borderWidth } ${ borderWidth } 0`
          line1.style.borderRadius = `0 0 ${ borderRadius } 0`

          line2.style.left = `${ stepCenter - rowPos.left - ( lineWidth * 2 ) - offset }px`
          line2.style.borderWidth = `${ borderWidth } 0 0 ${ borderWidth }`
          line2.style.borderRadius = `${ borderRadius } 0 0 0`
        }

        // no above lines for starting group
        if (step.closest('.sortable-item.benchmarks').matches('.starting')) {
          return
        }

        // above
        lineHeight = Math.abs(rowPos.top - stepPos.top) / 2

        let line4 = Div({ className: `logic-line benchmark-line passthru line-${ step.id }-4` })
        let line3 = Div({ className: `logic-line benchmark-line passthru line-${ step.id }-3` }, [
          step.classList.contains('passthru') ? Span({ className: 'path-indicator' }, 'Pass-through') : null,
          line4,
        ])

        step.parentElement.append(line3)

        if (step.style.display === 'none') {
          line3.remove()
          return
        }

        clearLineStyle(line3)
        clearLineStyle(line4)
        line3.classList.remove('left', 'right', 'middle')

        line3.style.top = `0`
        line3.style.width = `${ lineWidth }px`
        line3.style.height = `${ lineHeight }px`

        line4.style.top = `100%`
        line4.style.width = `${ lineWidth }px`
        line4.style.height = `${ lineHeight }px`

        // center
        if (areNumbersClose(stepCenter, rowCenter, 1)) {
          line3.style.left = `calc(50% - ${ offset }px)`
          line3.style.width = 0
          line3.style.top = 0
          line3.style.height = `${ lineHeight * 2 }px`
          line3.style.borderWidth = `0 0 0 ${ borderWidth }`
          line4.style.display = 'none'
          line3.classList.add('middle')
        }
        // left side
        else if (stepCenter < rowCenter) {
          line3.style.left = `${ stepCenter - rowPos.left + lineWidth - offset }px`
          line3.style.borderWidth = `0 ${ borderWidth } ${ borderWidth } 0`
          line3.style.borderRadius = `0 0 ${ borderRadius } 0`
          line3.classList.add('left')
          line4.style.right = `${ lineWidth }px`
          line4.style.borderWidth = `${ borderWidth } 0 0 ${ borderWidth }`
          line4.style.borderRadius = `${ borderRadius } 0 0 0`
        }
        // right side
        else {
          line3.style.left = `${ rowCenter - rowPos.left }px`
          line3.style.borderWidth = `0 0 ${ borderWidth } ${ borderWidth }`
          line3.style.borderRadius = `0 0 0 ${ borderRadius } `
          line3.classList.add('right')
          line4.style.left = `${ lineWidth }px`
          line4.style.borderWidth = `${ borderWidth } ${ borderWidth } 0 0`
          line4.style.borderRadius = `0 ${ borderRadius } 0 0`
        }
      })
    }
    catch (e) {}

    // Above
    try {
      document.querySelectorAll('.logic-line.line-above').forEach(line => {

        let branchPos = line.parentElement.getBoundingClientRect()
        let stepPos = line.closest('.step-branches').previousElementSibling.getBoundingClientRect()

        let stepCenter = stepPos.left + stepPos.width / 2
        let branchCenter = branchPos.left + branchPos.width / 2

        let stepHeightCenter = stepPos.top + stepPos.height / 2
        let lineHeight = branchPos.top - stepHeightCenter

        clearLineStyle(line)
        line.classList.remove('left', 'right', 'middle')

        if (!( stepPos.left < branchCenter && branchCenter < stepPos.right )) {
          line.querySelectorAll('.line-inside').forEach(el => el.remove())
        }

        // center
        if (areNumbersClose(branchCenter, stepCenter, 1)) {
          line.classList.add('middle')
          lineHeight = branchPos.top - stepPos.bottom
          line.style.left = 'calc(50% - 1px)'
          line.style.top = `-${ lineHeight }px`
          line.style.height = `${ lineHeight }px`
          line.style.borderWidth = `0 0 0 ${ borderWidth }`
        }
        // middle but curvy
        else if (stepPos.left < branchCenter && branchCenter < stepPos.right) {

          lineHeight = Math.abs(branchPos.top - stepPos.bottom)

          let line1 = line
          let line2 = line1.querySelector('.line-inside')
          if (!line2) {
            line2 = Div({ className: `logic-line line-inside` })
            line1.append(line2)
          }

          clearLineStyle(line2)

          let lineWidth = Math.abs(branchCenter - stepCenter) / 2

          line1.style.top = `-${ lineHeight }px`
          line1.style.height = `${ lineHeight / 2 }px`
          line1.style.width = `${ lineWidth }px`

          line2.style.width = `${ lineWidth }px`
          line2.style.height = `${ lineHeight / 2 }px`
          line2.style.top = '100%'

          // right
          if (branchCenter > stepCenter) {
            line.classList.add('right')

            line1.style.right = `calc(50% - 1px + ${ lineWidth }px)`
            line1.style.borderBottomLeftRadius = borderRadius
            line1.style.borderWidth = `0 0 ${ borderWidth } ${ borderWidth }`
            line2.style.left = '100%'
            line2.style.borderWidth = `${ borderWidth } ${ borderWidth } 0 0`
            line2.style.borderTopRightRadius = borderRadius
          }
          else {
            line.classList.add('left')

            line1.style.left = `calc(50% - 1px + ${ lineWidth }px)`
            line1.style.borderBottomRightRadius = borderRadius
            line1.style.borderWidth = `0 ${ borderWidth } ${ borderWidth } 0`
            line2.style.right = '100%'
            line2.style.borderWidth = `${ borderWidth } 0 0 ${ borderWidth }`
            line2.style.borderTopLeftRadius = borderRadius
          }
        }
        // left side
        else if (branchCenter < stepCenter) {

          line.classList.add('left')

          line.style.left = 'calc(50% - 1px)'
          line.style.width = `${ stepPos.left - branchCenter }px`
          line.style.top = `-${ lineHeight }px`
          line.style.height = `${ lineHeight }px`
          line.style.borderWidth = `${ borderWidth } 0 0 ${ borderWidth }`
          line.style.borderTopLeftRadius = borderRadius
        }
        // right side
        else {

          line.classList.add('right')

          line.style.right = 'calc(50% - 1px)'
          line.style.width = `${ branchCenter - stepPos.right }px`
          line.style.top = `-${ lineHeight }px`
          line.style.height = `${ lineHeight }px`
          line.style.borderWidth = `${ borderWidth } ${ borderWidth } 0 0`
          line.style.borderTopRightRadius = borderRadius
        }

      })
    }
    catch (e) {}

    // Below
    try {
      document.querySelectorAll('.logic-line.line-below').forEach(el => {

        let line1 = el
        let line2 = el.nextElementSibling

        let branchPos = line1.parentElement.getBoundingClientRect()
        let containerPos = line1.closest('.sortable-item').getBoundingClientRect()

        let stepCenter = containerPos.left + containerPos.width / 2
        let branchCenter = branchPos.left + branchPos.width / 2

        let lineHeight = Math.abs(containerPos.bottom - branchPos.bottom) / 2
        let lineWidth = Math.abs(stepCenter - branchCenter) / 2

        clearLineStyle(line1)
        clearLineStyle(line2)

        // center
        if (areNumbersClose(stepCenter, branchCenter, 1)) {
          line1.style.left = 'calc(50% - 1px)'
          line1.style.bottom = `-${ lineHeight * 2 }px`
          line1.style.height = `${ lineHeight * 2 }px`
          line1.style.borderWidth = `0 0 0 ${ borderWidth }`
          line2.style.display = 'none'
        }
        // left side
        else if (branchCenter < stepCenter) {
          line1.style.left = 'calc(50% - 1px)'
          line1.style.width = `${ lineWidth }px`
          line1.style.bottom = `-${ lineHeight }px`
          line1.style.height = `${ lineHeight }px`
          line1.style.borderWidth = `0 0 ${ borderWidth } ${ borderWidth }`
          line1.style.borderBottomLeftRadius = borderRadius

          line2.style.left = `calc(50% + ${ lineWidth - 1 }px)`
          line2.style.width = `${ lineWidth }px`
          line2.style.bottom = `-${ lineHeight * 2 }px`
          line2.style.height = `${ lineHeight }px`
          line2.style.borderWidth = `${ borderWidth } ${ borderWidth } 0 0`
          line2.style.borderTopRightRadius = borderRadius

        }
        // right side
        else {
          line1.style.right = `calc(50% - 1px)`
          line1.style.width = `${ lineWidth }px`
          line1.style.bottom = `-${ lineHeight }px`
          line1.style.height = `${ lineHeight }px`
          line1.style.borderWidth = `0 ${ borderWidth } ${ borderWidth } 0`
          line1.style.borderBottomRightRadius = borderRadius

          line2.style.right = `calc(50% + ${ lineWidth - 1 }px)`
          line2.style.width = `${ lineWidth }px`
          line2.style.bottom = `-${ lineHeight * 2 }px`
          line2.style.height = `${ lineHeight }px`
          line2.style.borderWidth = `${ borderWidth } 0 0 ${ borderWidth }`
          line2.style.borderTopLeftRadius = borderRadius
        }

      })
    }
    catch (e) {}

    // loops
    try {
      document.querySelectorAll('.step-branch .step.loop, .step-branch .step.logic_loop:not(.loop_broken)').forEach(el => {

        // the step-branch.benchmarks container
        let stepPos = el.getBoundingClientRect()
        let stepId = el.dataset.id
        let targetStepId = Funnel.steps.find(s => s.ID == stepId).meta.next

        if (!targetStepId || typeof targetStepId == 'undefined' || targetStepId == 0) {
          return
        }

        let targetStep = document.getElementById(`step-${ targetStepId }`)
        let widestEl = findWidestElementBetween(targetStep, el)
        let targetPos = targetStep.getBoundingClientRect()

        let lineHeight = Math.abs(( stepPos.bottom - ( stepPos.height / 2 ) ) - ( targetPos.bottom - ( targetPos.height / 2 ) ))
        let minWidth = Math.min(stepPos.width, targetPos.width)

        let branchPos = el.closest('.step-branch').getBoundingClientRect()
        let sortable = el.closest('.sortable-item')
        let sortablePos = sortable.getBoundingClientRect()

        let line = sortable.querySelector(`div.logic-line.loop-${ stepId }-to-${ targetStepId }`)

        if (!line) {
          line = Div({ className: `logic-line loop-line loop-${ stepId }-to-${ targetStepId }` }, [
            Div({ className: 'line-arrow top' }),
            Div({ className: 'line-arrow left' }),
            Div({ className: 'line-arrow bottom' }),
          ])
          sortable.append(line)
        }

        clearLineStyle(line)

        let width = ( ( widestEl ? widestEl.getBoundingClientRect().width : branchPos.width ) ) / 2

        line.style.bottom = `${ Math.abs(sortablePos.bottom - stepPos.bottom) + ( stepPos.height / 2 ) }px`
        line.style.width = `${ width }px`
        line.style.right = `calc(50% + ${ minWidth / 2 }px)`
        line.style.height = `${ lineHeight }px`
        line.style.borderWidth = `${ borderWidth } 0 ${ borderWidth } ${ borderWidth }`
        line.style.borderBottomLeftRadius = borderRadius
        line.style.borderTopLeftRadius = borderRadius

      })
    }
    catch (e) {}

    const skipLine = (from, to, offset = 0) => {

      // the step-branch.benchmarks container
      let widestEl = findWidestElementBetween(from, to)

      let fromPos = from.getBoundingClientRect()
      let toPos = to.getBoundingClientRect()

      let lineHeight = Math.abs(( ( fromPos.bottom - ( fromPos.height / 2 ) ) ) - ( toPos.bottom - ( toPos.height / 2 ) ) + offset)
      let minWidth = Math.min(fromPos.width, toPos.width)

      let branch = from.closest('.step-branch')
      let branchPos = branch.getBoundingClientRect()

      let sortable = from.closest('.sortable-item')
      let sortablePos = sortable.getBoundingClientRect()

      let line = sortable.querySelector(`div.logic-line.skip-${ from.dataset.id }-to-${ to.dataset.id }`)

      if (!line) {
        line = Div({ className: `logic-line skip-line skip-${ from.dataset.id }-to-${ to.dataset.id }` }, [
          Div({ className: 'line-arrow top' }),
          Div({ className: 'line-arrow right' }),
          Div({ className: 'line-arrow bottom' }),
        ])
        sortable.append(line)
      }

      clearLineStyle(line)

      let width = ( ( widestEl ? widestEl.getBoundingClientRect().width : branchPos.width ) ) / 2

      line.style.top = `${ fromPos.top - sortablePos.top + ( fromPos.height / 2 ) }px`
      line.style.width = `${ width + offset }px`
      line.style.left = `calc(50% + ${ minWidth / 2 }px)`
      line.style.height = `${ lineHeight }px`
      line.style.borderWidth = `${ borderWidth } ${ borderWidth } ${ borderWidth } 0`
      line.style.borderTopRightRadius = borderRadius
      line.style.borderBottomRightRadius = borderRadius

    }

    // skips
    try {
      document.querySelectorAll('.step-branch .step.skip, .step-branch .step.logic_skip:not(.loop_broken)').forEach(step => {

        // the step-branch.benchmarks container
        let stepId = step.dataset.id
        let targetStepId = Funnel.steps.find(s => s.ID == stepId).meta.next

        if (!targetStepId || typeof targetStepId == 'undefined' || targetStepId == 0) {
          return
        }

        let targetStep = document.getElementById(`step-${ targetStepId }`)

        skipLine(step, targetStep)
      })
    }
    catch (e) {}

    // stops
    try {
      document.querySelectorAll('.step-branch .step.logic_stop').forEach(step => {

        // the step-branch.benchmarks container
        let stepId = step.dataset.id
        let stepPos = step.getBoundingClientRect()
        let sortablePos = step.parentElement.getBoundingClientRect()

        let line = step.parentElement.querySelector('.logic-line.line-end')
        clearLineStyle(line)

        line.style.top = `${ stepPos.bottom - sortablePos.top }px`
        line.style.height = '30px'
        line.style.width = `${ stepPos.width / 2 }px`
        line.style.left = 'calc(50% - 1px)'
        line.style.borderWidth = `0 0 ${ borderWidth } ${ borderWidth }`
        line.style.borderRadius = `0 0 0 ${ borderRadius }`
      })
    }
    catch (e) {}

    // timer skips
    try {
      document.querySelectorAll('.step-branch .step.timer_skip').forEach(step => {

        let stepId = step.dataset.id

        let timers = Funnel.steps.find(s => s.ID == stepId).meta.timers

        if (!timers || !timers.length) {
          return
        }

        timers.forEach((targetStepId, i) => {

          if (!targetStepId || typeof targetStepId == 'undefined') {
            return
          }

          let targetStep = document.getElementById(`step-${ targetStepId }`)

          skipLine(step, targetStep, 20 * i)
        })

      })
    }
    catch (e) { console.log(e) }

    $(document).trigger('draw-logic-lines')

  }

  function selectText (node) {

    if (document.body.createTextRange) {
      const range = document.body.createTextRange()
      range.moveToElementText(node)
      range.select()
    }
    else if (window.getSelection) {
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(node)
      selection.removeAllRanges()
      selection.addRange(range)
    }
    else {
      console.warn('Could not select text in node: Unsupported browser.')
    }
  }

  $(document).on('dblclick', '.step.settings table code,.step.settings table pre', e => {
    selectText(e.currentTarget)
    navigator.clipboard.writeText(e.currentTarget.innerText)
    dialog({
      message: 'Copied to clipboard!',
    })
  })

  $(document).on('click', '.step.settings input.copy-text,.step.settings textarea.copy-text', e => {
    e.currentTarget.select()
    navigator.clipboard.writeText(e.currentTarget.value)
    dialog({
      message: 'Copied to clipboard!',
    })
  })

  window.addEventListener('resize', drawLogicLines)

  Groundhogg.drawLogicLines = drawLogicLines

} )(jQuery)
