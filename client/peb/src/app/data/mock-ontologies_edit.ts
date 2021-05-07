import { Ontology } from '../ontology';

export const ONTOLOGY: Ontology = {
    id: '17f65822-8b23-42c6-8285-591c69797340',
    name: {
      'it': 'Guide turistiche'
    },
    lastModified: 'Tue Feb 06 2018 15:59:49 GMT+0100 (CET)',
    shared: false,
    entities: 123,
    terminology: 123,
    contents: 123,
    imported: [],
    items:[



      {
        "id": "http:\/\/dati.beniculturali.it\/cis\/Event",
        "name": {
            "en": "Event",
            "it": "Evento"
        },
        "lastModified": "",
        "type": "entity",
        "properties": [
            {
                "type": "relation",
                "id": "http:\/\/dati.beniculturali.it\/cis\/RoleInTime@http:\/\/dati.beniculturali.it\/cis\/Event",
                "value": {
                    "value": {
                        "id": "http:\/\/dati.beniculturali.it\/cis\/RoleInTime",
                        "type": "\u00e8 relativo a ruolo nel tempo"
                    },
                    "id": "http:\/\/dati.beniculturali.it\/cis\/",
                    "type": "culturalOn"
                },
                "name": {
                    "en": "is related to role in time",
                    "it": "\u00e8 relativo a ruolo nel tempo"
                },
                "multivalue": false,
                "mandatory": false,
                "order": 3
            },
            {
                "type": "relation",
                "id": "http:\/\/dati.beniculturali.it\/cis\/Event@http:\/\/dati.beniculturali.it\/cis\/Event",
                "value": {
                    "value": {
                        "id": "http:\/\/dati.beniculturali.it\/cis\/Event",
                        "type": "ha sotto eventi"
                    },
                    "id": "http:\/\/dati.beniculturali.it\/cis\/",
                    "type": "culturalOn"
                },
                "name": {
                    "en": "has sub event",
                    "it": "ha sotto eventi"
                },
                "multivalue": false,
                "mandatory": false,
                "order": 2
            },
            {
                "type": "relation",
                "id": "http:\/\/dati.beniculturali.it\/cis\/Ticket@http:\/\/dati.beniculturali.it\/cis\/Event",
                "value": {
                    "value": {
                        "id": "http:\/\/dati.beniculturali.it\/cis\/Ticket",
                        "type": "ha biglietto"
                    },
                    "id": "http:\/\/dati.beniculturali.it\/cis\/",
                    "type": "culturalOn"
                },
                "name": {
                    "en": "has ticket",
                    "it": "ha biglietto"
                },
                "multivalue": false,
                "mandatory": false,
                "order": 1
            },
            {
                "type": "property",
                "id": "http:\/\/www.w3.org\/2000\/01\/rdf-schema#Literal@http:\/\/dati.beniculturali.it\/cis\/Event",
                "value": {
                    "id": "http:\/\/www.w3.org\/2000\/01\/rdf-schema#Literal",
                    "type": "field"
                },
                "name": {
                    "en": "name",
                    "it": "nome"
                },
                "multivalue": false,
                "mandatory": false,
                "order": 4
            },
            {
                "type": "relation",
                "id": "http:\/\/dati.beniculturali.it\/cis\/Event@http:\/\/dati.beniculturali.it\/cis\/Event",
                "value": {
                    "value": {
                        "id": "http:\/\/dati.beniculturali.it\/cis\/Event",
                        "type": "\u00e8 sotto evento di"
                    },
                    "id": "http:\/\/dati.beniculturali.it\/cis\/",
                    "type": "culturalOn"
                },
                "name": {
                    "en": "is sub-event of",
                    "it": "\u00e8 sotto evento di"
                },
                "multivalue": false,
                "mandatory": false,
                "order": 5
            },
            {
                "type": "relation",
                "id": "http:\/\/dati.beniculturali.it\/cis\/Site@http:\/\/dati.beniculturali.it\/cis\/Event",
                "value": {
                    "value": {
                        "id": "http:\/\/dati.beniculturali.it\/cis\/Site",
                        "type": "\u00e8 ospitato da"
                    },
                    "id": "http:\/\/dati.beniculturali.it\/cis\/",
                    "type": "culturalOn"
                },
                "name": {
                    "en": "is hosted by",
                    "it": "\u00e8 ospitato da"
                },
                "multivalue": false,
                "mandatory": false,
                "order": 6
            }
        ],
        "hidden": false,
        "isModified": false
    },




      {
        id: '17f65822-8b23-42c6-8285-591c69797340',
        name: {
          'it': 'Museo'
        },
        type: 'entity',
        hidden: false,
        lastModified: 'Tue Feb 06 2018 15:59:49 GMT+0100 (CET)',
        isModified: false,
        properties: [
          {
            id: '17f65822-8b23-42c6-8285-591c69797343',
            type: 'relation',
            value: {
              'type': 'culturalOn', 
              'id': '17f65822-8b23-42c6-8285-591c69797344',
              value: {
                id: '1234',
                type: 'ha biglietto' 
              }
            },
            name: {
              'it': 'Sede'
            },
            multivalue: false,
            mandatory: false,
            order: 1
          },
          {
            id: '17f65822-8b23-42c6-8285-591c69797345',
            type: 'superclass',
            value: '17f65822-8b23-42c6-8285-591c69797340'
          },
          {
            id: '17f65822-8b23-42c6-8285-591c69797347',
            type: 'property',
            value: {
              id: '1236',
              type: 'campo corto'
            },
            name: {
              'it': 'Sede'
            },
            multivalue: false,
            mandatory: false,
            order: 2
          }
        ]
      },
      {
        id: '17f65822-8b23-42c6-8285-591c69797440',
        name: {
          'it': 'Entità di prova'
        },
        type: 'entity',
        hidden: false,
        lastModified: 'Tue Feb 06 2018 15:59:49 GMT+0100 (CET)',
        isModified: false,
        properties: [
          {
            id: '17f65822-8b23-42c6-8285-591c69797343',
            type: 'relation',
            value: {
              'type': 'culturalOn', 
              'id': '17f65822-8b23-42c6-8285-591c69797344',
              value: {
                id: '1234',
                type: 'ha biglietto' 
              }
            },
            name: {
              'it': 'Sede'
            },
            multivalue: true,
            mandatory: true,
            order: 1
          },
          {
            id: '17f65822-8b23-42c6-8285-591c69797345',
            type: 'superclass',
            value: '17f65822-8b23-42c6-8285-591c69797340',
            order: 2
          },
          {
            id: '17f65822-8b23-42c6-8285-591c69797347',
            type: 'property',
            value: {
              id: '1236',
              type: 'campo corto'
            },
            name: {
              'it': 'Sede'
            },
            multivalue: false,
            mandatory: true,
            order: 3
          }
        ]
      },
      {
        id: '17f65822-8b23-42c6-8285-591c69797341',
        name: {
          'it': 'Museo Artistico Industriale'
        },
        type: 'terminology',
        hidden: false,
        lastModified: 'Tue Feb 06 2018 15:59:49 GMT+0100 (CET)',
        isModified: true,
        properties: [
          {
            id: '17f65822-8b23-42c6-8285-591c69797350',
            type: 'headword',
            value: {
              id: '1238',
              type: 'sostantivo'
            },
            name: {
              'it': 'Mueo Archeologico'
            },
            order: 1
          },
          {
            id: '17f65822-8b23-42c6-8285-591c69797350',
            type: 'headword',
            value: {
              id: '1238',
              type: 'sostantivo'
            },
            name: {
              'it': 'Mueo Archeologico'
            },
            order: 2
          },
          {
            id: '17f65822-8b23-42c6-8285-591c69797352',
            type: 'relation',
            value: {
              'type': 'culturalOn',
              'id': '17f65822-8b23-42c6-8285-591c69797353'
            },
            name: {
              'it': 'Mueo Archeologico'
            },
            order: 3
          },
          {
            id: '17f65822-8b23-42c6-8285-591c69797354',
            type: 'category',
            value: 100,
            name: {
              'it': 'Archeologia'
            },
            order: 4
          }
        ]
      },
      {
        id: '17f65822-8b23-42c6-8285-591c69797342',
        name: {
          'it': 'museologia'
        },
        type: 'content',
        hidden: false,
        lastModified: 'Tue Feb 06 2018 15:59:49 GMT+0100 (CET)',
        isModified: true,
        complete: false,
        superclass: {
          id: '17f65822-8b23-42c6-8285-591c69797348',
          value: '17f65822-8b23-42c6-8285-591c69797340'
        },
        properties: [
          {
            id: '17f65822-8b23-42c6-8285-591c69797355',
            type: 'headword',
            value: {
              id: '1238',
              type: 'sostantivo'
            },
            name: {
              'it': 'Mueo Archeologico'
            },
            order: 1
          },
          {
            id: '17f65822-8b23-42c6-8285-591c69797357',
            type: 'relation',
            value: {
              'type': 'culturalOn', 
              'id': '17f65822-8b23-42c6-8285-591c69797358'
            },
            name: {
              'it': 'Museo Archeologico'
            },
            order: 2
          },
          {
            id: '17f65822-8b23-42c6-8285-591c69797359',
            type: 'category',
            value: 100,
            name: {
              'it': 'Archeologia'
            },
            order: 3
          }
        ]
      }
    ],
    dataProperties: []
}
