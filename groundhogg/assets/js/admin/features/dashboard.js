( ($) => {

  const {
    Div,
    H2,
    H3,
    Input,
    Toggle,
    Label,
    H1,
    Fragment,
    Span,
    An,
    Nav,
    Img,
    Pg,
    Bold,
    Button,
    Dashicon,
    Skeleton,
    Modal,
    makeEl,
    Table,
    THead,
    TBody,
    Tr,
    Td,
    Th,
  } = MakeEl

  const {
    sprintf,
    __,
    _x,
    _n,
  } = wp.i18n

  const {
    ContactListItem,
    ContactList,
    FeedbackModal,
  } = Groundhogg.components

  const {
    ReportTable,
  } = Groundhogg.reporting

  const {
    icons,
    adminPageURL,
    moreMenu,
  } = Groundhogg.element

  const {
    userHasCap,
  } = Groundhogg.user

  const {
    ajax,
    get,
  } = Groundhogg.api

  const { formatNumber } = Groundhogg.formatting

  const isWidgetDisabled = id => {
    let disabledWidgets = JSON.parse(localStorage.getItem('gh_disabled_widgets')) || []
    return disabledWidgets.includes(id)
  }
  const isWidgetCollapsed = id => {
    let collapsedWidgets = JSON.parse(localStorage.getItem('gh_collapsed_widgets')) || []
    return collapsedWidgets.includes(id)
  }

  const toggleWidget = (id) => {
    let disabledWidgets = JSON.parse(localStorage.getItem('gh_disabled_widgets')) || []
    if (disabledWidgets.includes(id)) {
      disabledWidgets.splice(disabledWidgets.indexOf(id), 1)
    }
    else {
      disabledWidgets.push(id)
    }
    localStorage.setItem('gh_disabled_widgets', JSON.stringify(disabledWidgets))
    morphDashboard()
  }

  const collapseWidget = (id) => {
    let disabledWidgets = JSON.parse(localStorage.getItem('gh_collapsed_widgets')) || []
    if (disabledWidgets.includes(id)) {
      disabledWidgets.splice(disabledWidgets.indexOf(id), 1)
    }
    else {
      disabledWidgets.push(id)
    }
    localStorage.setItem('gh_collapsed_widgets', JSON.stringify(disabledWidgets))
  }

  const Widget = ({
    id,
    name = '',
    feedback = false,
    render = () => {},
  }) => {

    if (isWidgetDisabled(id)) {
      return null
    }

    const morph = () => morphdom(document.getElementById(`${ id }-widget`), El())

    const El = () => Div({
      id       : `${ id }-widget`,
      className: `gh-panel ${ isWidgetCollapsed(id) ? 'closed' : '' }`,
    }, [
      Div({ className: `gh-panel-header` }, [
        H2({}, name),
        feedback && !Groundhogg.isWhiteLabeled ? An({
          href       : '#',
          className  : 'feedback-modal',
          dataSubject: `${ name } dashboard widget`,
          style      : {
            padding: '8px',
          },
        }, __('Feedback')) : null,
        Button({
          className: 'toggle-indicator',
          onClick  : e => {
            collapseWidget(id)
            morph()
          },
        }),
      ]),
      isWidgetCollapsed(id) ? null : render(),
    ])

    return El()
  }

  const WidgetColumn = (col = 0) => Div({
    className: 'display-flex column gap-20 full-width span-4',
  }, Widgets.map((item, id) => {

    if (item.col !== col) {
      return null
    }

    try {
      return Widget({
        id,
        ...item,
      })
    }
    catch (e) {
      // error notice for the widget
      return Widget({
        id,
        ...item,
        render: () => Div({
          className: 'inside'
        }, Pg({
          className: 'gh-text danger red error'
        }, 'Something went wrong with this widget.'))
      })
    }
  }))

  const WidgetsColumns = () => Div({
    className: 'display-grid gap-20',
    style    : {
      padding: '20px',
    },
  }, [

    WidgetColumn(1),
    WidgetColumn(2),
    WidgetColumn(3),

  ])

  const Header = () => Div({
    id       : 'dashboard-header',
    className: 'gh-header sticky no-padding display-flex flex-start',
  }, [
    Groundhogg.isWhiteLabeled ? Span({ className: 'white-label-icon'}, Groundhogg.whiteLabelName ) : icons.groundhogg,
    H1({}, `👋 Hey ${ Groundhogg.currentUser.data.display_name }!`),
    Button({
      className: 'gh-button primary more-nav small',
      id       : 'quick-actions',
      onClick  : e => {
        moreMenu(e.currentTarget, [
          {
            key     : 'broadcast',
            text    : __('Schedule a broadcast'),
            onSelect: () => {
              window.open(adminPageURL('gh_broadcasts', { action: 'add' }), '_self')
            },
          },
          {
            key     : 'funnel',
            text    : __('Create a flow'),
            onSelect: () => {
              window.open(adminPageURL('gh_funnels', { action: 'add' }), '_self')
            },
          },
          {
            key     : 'reports',
            text    : __('View reports'),
            onSelect: () => {
              window.open(adminPageURL('gh_reporting'), '_self')
            },
          },
        ])

      },
    }, __('Quick Actions')),
    Button({
      className: 'gh-button secondary icon text',
      id       : 'dashboard-more',
      style    : {
        marginRight: '10px',
      },
      onClick  : e => {
        moreMenu(e.currentTarget, [
          {
            key     : 'preferences',
            text    : __('Preferences'),
            onSelect: () => {
              Modal({}, morph => Div({}, [
                H2({}, 'Widgets'),
                ...Widgets.map((item, id) => Div({
                  className: 'display-flex gap-10',
                  style    : {
                    marginBottom: '10px',
                  },
                }, [
                  Toggle({
                    checked : !isWidgetDisabled(id),
                    id      : `toggle-${ id }`,
                    onChange: e => {
                      toggleWidget(id)
                    },
                  }),
                  Label({
                    for: `toggle-${ id }`,
                  }, item.name),
                ])),
              ]))
            },
          },
          Groundhogg.isWhiteLabeled ? null : {
            key     : 'feedback',
            text    : 'Feedback',
            onSelect: e => {
              FeedbackModal({
                subject: 'My Dashboard',
              })
            },
          },
        ])
      },
    }, icons.verticalDots),
  ])

  const Dashboard = () => Div({
    id: 'dashboard',
  }, [
    Header(),
    WidgetsColumns(),
  ])

  const morphDashboard = () => morphdom(document.getElementById('dashboard'), Dashboard())

  const Checklist = ({
    id,
    items,
    buttonText = __('Finish Task', 'groundhogg'),
    moreText = __('Instructions', 'groundhogg'),
  }) => {

    const State = Groundhogg.createState({})
    const isExpanded = index => State.get(`expand${ index + 1 }`)

    return Div({
      id,
      className: 'onboarding-checklist',
    }, morph => Fragment(items.map(({
      title,
      description = '',
      completed = false,
      fix = '#',
      more = false,
    }, i) => Div({
      className: `checklist-item checklist-row ${ completed ? 'complete' : '' }`,
      id       : `checklist-item-${ i + 1 }`,
      style    : {
        paddingLeft: '10px',
      },
    }, [
      Div({
        id       : `checklist-item-toggle-${ i + 1 }`,
        className: 'display-flex gap-10 align-center',
        onClick  : e => {

          if (completed) {
            return
          }

          State.set({
            [`expand${ i + 1 }`]: !isExpanded(i),
          })
          morph()
        },
      }, [
        completed ? '✅' : '❌',
        Pg({
          style: {
            fontWeight: isExpanded(i) ? '500' : '400',
            margin    : '0',
            fontSize  : '14px',
            flexGrow  : 1,
          },
        }, title),
        !completed ? isExpanded(i) ? Dashicon('arrow-up-alt2') : Dashicon('arrow-down-alt2') : null,
      ]),
      State.get(`expand${ i + 1 }`) ? Fragment([
        Pg({}, description),
        An({
          href     : fix,
          className: 'gh-button primary small',
          target   : '_blank',
        }, buttonText),
        ' ',
        more && !Groundhogg.isWhiteLabeled ? An({
          href     : more,
          className: 'gh-button primary text small',
          target   : '_blank',
          id       : `more-info-${ i + 1 }`,
        }, moreText) : null,
      ]) : null,
    ]))))
  }

  const News = () => {

    const State = Groundhogg.useState({
      loaded: false,
      items : [],
    }, News)

    return Div({
      id   : 'my-news',
      style: {
        maxHeight: '500px',
        overflow : 'auto',
      },
    }, morph => {

      if (!State.loaded) {

        ajax({
          action: 'gh_get_news',
        }).then(r => {

          State.set({
            loaded: true,
            items : r,
          })

          morph()

        })

        return Skeleton({
          style: {
            padding: '20px',
          },
        }, [
          'full',
          'full',
          'full',
        ])
      }

      return Fragment(
        State.items.slice(0, 5).map(item => makeEl('article', {
          style: {
            padding: '10px',
          },
        }, [
          An({
            href  : item.link,
            target: '_blank',
          }, Img({ src: item.yoast_head_json.og_image[0].url })),
          H3({
            style: {
              marginTop: 10,
            },
          }, An({
            href  : item.link,
            target: '_blank',
          }, item.title.rendered)),
          item.excerpt.rendered,
        ])),
      )
    })

  }
  const QuickStart = () => {

    const State = Groundhogg.useState({
      loaded: false,
      items : [],
    }, QuickStart)

    return Div({
      id: 'my-checklist',
    }, morph => {

      if (!State.loaded) {

        ajax({
          action: 'gh_get_checklist_items',
        }).then(r => {

          State.set({
            loaded: true,
            items : r.data.items,
          })

          morph()

        })

        return Skeleton({
          style: {
            padding: '20px',
          },
        }, [
          'span-3',
          'span-9',
          'span-3',
          'span-9',
          'span-3',
          'span-9',
          'span-3',
          'span-9',
        ])
      }

      if (State.items.every(item => item.completed)) {
        return Pg({
          style: {
            textAlign: 'center',
          },
        }, __('You\'re all set!'))
      }

      return Fragment([
        Pg({
          style: {
            padding: '0 20px',
          },
        }, __('Click on a task to view additional details.')),
        Checklist({
          id   : 'quickstart-items',
          items: State.items,
        }),
      ])
    })

  }
  const Recommendations = () => {

    const State = Groundhogg.useState({
      loaded: false,
      items : [],
    }, Recommendations)

    return Div({
      id: 'my-recommendations',
    }, morph => {

      if (!State.loaded) {

        ajax({
          action: 'gh_get_recommendation_items',
        }).then(r => {

          State.set({
            loaded: true,
            items : r.data.items,
          })

          morph()

        })

        return Skeleton({
          style: {
            padding: '20px',
          },
        }, [
          'span-3',
          'span-9',
          'span-3',
          'span-9',
          'span-3',
          'span-9',
          'span-3',
          'span-9',
        ])
      }

      if (State.items.every(item => item.completed)) {
        return Pg({
          style: {
            textAlign: 'center',
          },
        }, __('No recommendations!'))
      }

      return Fragment([
        Pg({
          style: {
            padding: '0 20px',
          },
        }, __('Click on a recommendation to view additional details.')),
        Checklist({
          id        : 'recommendation-items',
          items     : State.items,
          buttonText: __('Implement'),
        }),
      ])
    })

  }
  const Summary = () => {

    const State = Groundhogg.useState({
      loaded: false,
    }, Summary)

    return Div({
      id: 'contact-reports',
    }, morph => {

      if (!State.loaded) {

        Promise.all([

          // daily report
          get(Groundhogg.api.routes.v4.reports, {
            reports: [
              'total_new_contacts',
              'total_confirmed_contacts',
              'total_engaged_contacts',
              'total_unsubscribed_contacts',
            ],
            range  : 'today',
          }).then(r => {
            State.set({
              today: r.reports,
            })
          }),

          // monthly report
          get(Groundhogg.api.routes.v4.reports, {
            reports: [
              'total_new_contacts',
              'total_confirmed_contacts',
              'total_engaged_contacts',
              'total_unsubscribed_contacts',
            ],
            range  : 'this_month',
          }).then(r => {
            State.set({
              month: r.reports,
            })
          }),

          // recently created contacts
          Groundhogg.stores.contacts.fetchItems({
            orderby: 'date_created',
            order  : 'DESC',
            limit  : 5,
          }).then(contacts => {
            State.set({
              contacts,
            })
          }),

        ]).then(() => {
          State.set({
            loaded: true,
          })

          morph()
        })

        return Skeleton({
          style: {
            padding: '20px',
          },
        }, [
          'half',
          'half',
          'full',
          'full',
        ])
      }

      const ReportHead = title => Bold({
        style: {
          borderBottom : '1px solid',
          marginBottom : '5px',
          paddingBottom: '5px',
        },
      }, title)
      const Stat = (title, report) => {

        let change = Span({
          className: 'percentage-change',
          style    : {
            fontWeight: 500,
            fontSize  : '12px',
            padding   : '2px',
            color     : report.compare.arrow.color === 'green' ? '#99cc00' : '#ff0000',
          },
        }, [
          report.compare.arrow.direction === 'up' ? '&#x25B4;' : '&#x25BE;',
          report.compare.percent,
        ])

        if (report.data.current == report.data.compare) {
          change = ''
        }

        return Div({
          className: 'display-flex space-between align-bottom',
        }, [
          Span({
            style: {
              fontSize: '12px',
              // fontWeight: 300
            },
          }, title),
          Span({}, [
            report.number,
            change,
          ]),
        ])
      }

      return Div({
        className: 'display-grid',
      }, [
        Div({
          className: 'half inside display-flex column',
        }, [
          ReportHead(__('This month')),
          Stat('New contacts', State.month.total_new_contacts),
          Stat('Confirmed', State.month.total_confirmed_contacts),
          Stat('Engaged', State.month.total_engaged_contacts),
          Stat('Unsubscribed', State.month.total_unsubscribed_contacts),
        ]),
        Div({
          className: 'half inside display-flex column',
        }, [
          ReportHead(__('Today')),
          Stat('New contacts', State.today.total_new_contacts),
          Stat('Confirmed', State.today.total_confirmed_contacts),
          Stat('Engaged', State.today.total_engaged_contacts),
          Stat('Unsubscribed', State.today.total_unsubscribed_contacts),
        ]),
        Div({
          className: 'full',
        }, [
          Div({
            style: {
              padding: '0 0 10px 20px',
            },
          }, Bold({}, __('Recent subscribers'))),
          ContactList(State.contacts, {
            itemProps: item => ( {
              className: 'contact-list-item clickable',
              onClick  : e => {
                window.open(item.admin, '_self')
              },
            } ),
          }),
        ]),
      ])
    })

  }
  const Broadcasts = () => {

    const State = Groundhogg.useState({
      loaded: false,
    }, Broadcasts)

    return Div({
      id: 'broadcasts-report',
    }, morph => {

      if (!State.loaded) {

        get(Groundhogg.api.routes.v4.reports, {
          reports: [
            'table_all_broadcasts_performance',
          ],
          range  : 'this_week',
        }).then(r => {
          State.set({
            reports: r.reports,
            loaded : true,
          })
          morph()
        })

        return Skeleton({}, [
          'two-thirds',
          'third',
          'two-thirds',
          'third',
          'two-thirds',
          'third',
        ])
      }

      if (!State.reports.table_all_broadcasts_performance.data.length) {

        return Div({
          className: 'inside',
        }, [
          Pg({}, 'You haven\'t sent any broadcasts this week! 😱'),
          Pg({}, 'Send one to your subscribers before they forget about you.'),
          An({
            className: 'gh-button primary small',
            href     : adminPageURL('gh_broadcasts', {
              action: 'add',
            }),
          }, __('Send a broadcast!')),
        ])

      }

      return ReportTable('broadcasts', State.reports.table_all_broadcasts_performance)
    })
  }
  const Searches = () => {

    const State = Groundhogg.useState({
      loaded: false,
    }, Searches)

    return Div({
      id   : 'searches-table',
      style: {
        maxHeight: '500px',
        overflow : 'auto',
      },
    }, morph => {

      if (!State.loaded) {

        Groundhogg.stores.searches.fetchItems({
          counts: true,
        }).then(items => {
          State.set({
            loaded: true,
          })
          morph()
        })

        return Skeleton({}, [
          'span-9',
          'span-3',
          'span-9',
          'span-3',
          'span-9',
          'span-3',
        ])
      }

      if (!Groundhogg.stores.searches.hasItems()) {
        return Pg({
          style: {
            textAlign: 'center',
          },
        }, __('You don\'t have any saved searches.', 'groundhogg'))
      }

      return Div({
        className: 'gh-striped',
      }, Groundhogg.stores.searches.getItems().map(search => Div({
        className: 'row space-between',
        style    : {
          padding: '10px',
        },
      }, [
        Bold({}, search.name),
        An({
          href: adminPageURL('gh_contacts', {
            saved_search: search.id,
          }),
        }, `${ formatNumber(search.count) }`),
      ])))

    })

  }

  const Widgets = Groundhogg.createRegistry()

  if (!Groundhogg.isWhiteLabeled) {
    Widgets.add('links', {
      name  : 'Helpful Links',
      cap   : '',
      col   : 3,
      render: () => {

        let links1 = [
          [
            __('Groundhogg'),
            'https://groundhogg.io',
          ],
          [
            __('HollerBox'),
            'https://hollerwp.com',
          ],
          [
            __('MailHawk'),
            'https://mailhawk.io',
          ],
          [
            __('Adrian Tobey'),
            'https://adriantobey.com',
          ],
        ].map(([text, href]) => ( [
          Img({ src: `https://www.google.com/s2/favicons?domain=${ ( new URL(href) ).hostname }` }),
          text,
          href,
        ] ))

        let links2 = [
          [
            'welcome-learn-more',
            __('Learn'),
            'https://academy.groundhogg.io',
          ],
          [
            'media-document',
            __('Documentation'),
            'https://help.groundhogg.io',
          ],
          [
            'sos',
            __('Get Help'),
            adminPageURL('gh_help'),
          ],
          [
            'admin-site',
            __('Support Group'),
            'https://facebook.com/groups/groundhoggwp/',
          ],
          [
            'admin-users',
            __('My Account'),
            'https://groundhogg.io/account/',
          ],
        ].map(([icon, text, href]) => ( [
          Dashicon(icon),
          text,
          href,
        ] ))

        let socials = [
          [
            'youtube',
            __('YouTube'),
            'https://www.youtube.com/Groundhogg',
          ],
          [
            'twitter',
            __('X (Twitter)'),
            'https://twitter.com/groundhoggwp',
          ],
          [
            'facebook',
            __('Facebook'),
            'https://www.facebook.com/groups/groundhoggwp/',
          ],
          [
            'instagram',
            __('Instagram'),
            'https://www.instagram.com/groundhoggwp/',
          ],
          [
            'wordpress',
            __('WordPress.org'),
            'https://wordpress.org/plugins/groundhogg/',
          ],
          [
            'linkedin',
            __('LinkedIn'),
            'https://www.linkedin.com/company/groundhogg/',
          ],
        ].map(([icon, text, href]) => ( [
          Img({
            src   : `${ Groundhogg.assets.images }/social-icons/brand-boxed/${ icon }.png`,
            height: '16',
            width : '16',
          }),
          text,
          href,
        ] ))

        const makeLink = ([icon, text, href]) => An({
          href,
          target: '_blank',
        }, Span({ className: 'display-flex align-center gap-5' }, [
          icon,
          text,
        ]))
        const makeLinks = links => links.map(makeLink)

        return Div({
          className: 'inside display-flex gap-20',
        }, [
          Nav({ className: 'display-flex column gap-10' }, [
            `<b>${ __('Resources') }</b>`,
            ...makeLinks(links2),
          ]),
          Nav({ className: 'display-flex column gap-10' }, [
            `<b>${ __('Our Sites') }</b>`,
            ...makeLinks(links1),
          ]),
          Nav({ className: 'display-flex column gap-10' }, [
            `<b>${ __('Follow Us') }</b>`,
            ...makeLinks(socials),
          ]),
        ])
      },
    })

    if (userHasCap('install_plugins')) {
      Widgets.add('notifications', {
        name  : 'Notifications',
        cap   : '',
        col   : 3,
        render: () => Div({
          style: {
            padding  : '10px',
            maxHeight: '500px',
            overflow : 'auto',
          },
        }, Groundhogg.Notifications()),
      })
    }

    Widgets.add('news', {
      name  : 'News',
      cap   : '',
      col   : 3,
      render: News,
    })
  }

  Widgets.add('checklist', {
    name    : 'Quickstart Checklist',
    cap     : '',
    col     : 1,
    feedback: true,
    render  : QuickStart,
  })

  Widgets.add('recommendations', {
    name    : 'Recommendations',
    cap     : '',
    col     : 1,
    feedback: true,
    render  : Recommendations,
  })

  Widgets.add('summary', {
    name  : 'Summary',
    cap   : '',
    col   : 2,
    render: Summary,
  })

  Widgets.add('broadcasts', {
    name  : 'Recent Broadcasts',
    col   : 2,
    render: Broadcasts,
  })

  Widgets.add('searches', {
    name  : 'Searches',
    col   : 1,
    render: Searches,
  })

  if (userHasCap('view_tasks')) {
    Widgets.add('tasks', {
      name    : 'My Tasks',
      cap     : '',
      col     : 2,
      feedback: true,
      render  : () => Groundhogg.ObjectTasks({
        title: false,
        style: {
          maxHeight: '500px',
          overflow : 'auto',
        },
      }),
    })
  }

  $(() => {
    console.log('render dashboard')
    morphDashboard()
  })

  Groundhogg.dashboard = {
    Widgets,
  }

} )(jQuery)
