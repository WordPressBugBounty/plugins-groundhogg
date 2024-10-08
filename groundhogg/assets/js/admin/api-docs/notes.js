(() => {

  const {
    ApiRegistry,
    CommonParams,
    setInRequest,
    getFromRequest,
    addBaseObjectCRUDEndpoints,
    currEndpoint,
    currRoute,
  } = Groundhogg.apiDocs
  const { root: apiRoot } = Groundhogg.api.routes.v4
  const { sprintf, __, _x, _n } = wp.i18n

  const {
    Fragment,
    Pg,
    Input,
    Textarea,
    InputRepeater,
  } = MakeEl

  ApiRegistry.add('notes', {
    name: __('Notes'),
    description: () => Fragment([
      Pg({}, __('Add or manage notes for contacts, or other types.', 'groundhogg'))
    ]),
    endpoints: Groundhogg.createRegistry(),
  })

  addBaseObjectCRUDEndpoints(ApiRegistry.notes.endpoints, {
    plural: __('notes'),
    singular: __('note'),
    route: `${apiRoot}/notes`,
    searchableColumns: [
      'content',
    ],
    orderByColumns: [
      'ID',
      'object_id',
      'object_type',
      'date_created',
      'timestamp',
      'type',
    ],
    readParams: [
      {
        param: 'object_type',
        type: 'string',
        description: __( 'Fetch notes belonging to a specific object type.', 'groundhogg' ),
        default: 'contact'
      },
      {
        param: 'user_id',
        type: 'int',
        description: __( 'Fetch notes created by a specific user.', 'groundhogg' ),
      },
      {
        param: 'type',
        type: 'string',
        description: __( 'Filter by the type of note.', 'groundhogg' ),
        options: [
          'note',
          'call',
          'email',
          'meeting',
        ]
      }
    ],
    dataParams: [
      {
        param: 'object_id',
        description: __('The ID of the object to associate with the note.', 'groundhogg'),
        type: 'int',
        required: true,
      },
      {
        param: 'object_type',
        description: __('The type of the object to associate with the note.', 'groundhogg'),
        type: 'string',
        default: 'contact',
        required: true,
      },
      {
        param: 'content',
        description: __('The HTML content of the note.', 'groundhogg'),
        type: 'string',
        required: true,
      },
      {
        param: 'type',
        description: __( 'The type of note it is.', 'groundhogg' ),
        type: 'string',
        default: 'note',
        options: [
          'note',
          'call',
          'email',
          'meeting',
        ]
      },
    ],
  })

})()
