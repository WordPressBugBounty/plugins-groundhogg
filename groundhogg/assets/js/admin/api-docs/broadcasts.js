(()=>{

  const { sprintf, __, _x, _n } = wp.i18n
  const { ApiRegistry, CommonParams, setInRequest, getFromRequest } = Groundhogg.apiDocs
  const { root: apiRoot } = Groundhogg.api.routes.v4

  const {
    Fragment,
    Pg,
    Input,
  } = MakeEl

  ApiRegistry.add('broadcasts', {
    name: __('Broadcasts'),
    description: () => Fragment([
      Pg({}, __('Send or manage broadcasts remotely.', 'groundhogg'))
    ]),
    endpoints: Groundhogg.createRegistry(),
  })

  ApiRegistry.broadcasts.endpoints.add('create', {
    name: __('Schedule a broadcast', 'groundhogg'),
    description: () => Pg({}, __('Schedule a new broadcast to be sent.', 'groundhogg')),
    method: 'POST',
    endpoint: `${ apiRoot }/broadcasts/`,
    params: [
      {
        param: 'object_type',
        type: 'string',
        required: false,
        options: ['email', 'sms'],
        default: 'email',
        description: () => Fragment([
          Pg({}, __('Specify whether the broadcast is for an email or SMS. If using SMS you must have the SMS addon installed.', 'groundhogg')),
        ]),
      },
      {
        param: 'object_id',
        type: 'int',
        required: true,
        description: () => Fragment([
          Pg({}, __('The ID of the email or SMS to use in the broadcast.', 'groundhogg')),
        ]),
      },
      {
        param: 'query',
        description: () => Fragment([
          Pg({}, __('The query object is how you select the contacts that will receive the broadcast.', 'groundhogg')),
        ]),
        type: 'object',
        required: true,
        subParams: [
          CommonParams.filters('contacts'),
        ],
      },
      {
        param: 'segment_type',
        type: 'string',
        required: false,
        options: [
          'fixed',
          'dynamic',
        ],
        default: 'fixed',
        description: () => Fragment([
          Pg({}, __('Which type of segment to use.', 'groundhogg')),
        ]),
      },
      {
        param: 'date',
        type: 'string',
        required: true,
        description: () => Fragment([
          Pg({}, __('The date you want to broadcast to be sent. Uses the site timezone.', 'groundhogg')),
          Pg({}, __('Unneeded if using <code>send_now</code>.', 'groundhogg')),
        ]),
        control: ({ param, id }) => Input({
          type: 'date',
          name: param,
          id,
          value: getFromRequest(param),
          onInput: e => setInRequest(param, e.target.value),
        }),
      },
      {
        param: 'time',
        type: 'string',
        required: true,
        description: () => Fragment([
          Pg({}, __('The time of day for broadcast to be sent. Uses the site timezone.', 'groundhogg')),
          Pg({}, __('Unneeded if using <code>send_now</code>.', 'groundhogg')),
        ]),
        control: ({ param, id }) => Input({
          type: 'time',
          name: param,
          id,
          value: getFromRequest(param),
          onInput: e => setInRequest(param, e.target.value),
        }),
      },
      {
        param: 'send_now',
        type: 'bool',
        required: false,
        description: () => Fragment([
          Pg({}, __('Whether to send the broadcast immediately.', 'groundhogg')),
        ]),
      },
      {
        param: 'send_in_local_time',
        type: 'bool',
        required: false,
        description: () => Fragment([
          Pg({}, __('Send based on the contacts\' local time.', 'groundhogg')),
        ]),
      },
      {
        param: 'batching',
        type: 'bool',
        required: false,
        description: () => Fragment([
          Pg({}, __('Whether to send the broadcast in batches.', 'groundhogg')),
        ]),
      },
      {
        param: 'batch_amount',
        type: 'int',
        required: false,
        description: () => Fragment([
          Pg({}, __('The size of the batches.', 'groundhogg')),
        ]),
      },
      {
        param: 'batch_interval',
        type: 'string',
        required: false,
        options: [
          'minutes',
          'hours',
          'days',
        ],
        description: () => Fragment([
          Pg({}, __('The batch interval unit.', 'groundhogg')),
        ]),
      },
      {
        param: 'batch_interval_length',
        type: 'int',
        required: false,
        description: () => Fragment([
          Pg({}, __('The length of the batch interval.', 'groundhogg')),
        ]),
      },
    ],
    request: {
      'query': {
        'filters': [
          [
            {
              'type': 'is_marketable',
              'marketable': 'yes',
            },
          ],
        ],
      },
      object_type: 'email',
      object_id: 1,
      date: moment().format('YYYY-MM-DD'),
      time: moment().add(1, 'hour').format('HH:00:00'),
      send_now: false,
    },
    response: {},
  })

  ApiRegistry.broadcasts.endpoints.add('cancel', {
    name: __('Cancel a broadcast', 'groundhogg'),
    description: () => Pg({}, __('Cancel a broadcast.', 'groundhogg')),
    method: 'POST',
    endpoint: `${ apiRoot }/broadcasts/:id`,
    identifiers: [
      CommonParams.id('broadcast')
    ],
    request: {},
    response: {
      status:'success'
    }
  })
})()
