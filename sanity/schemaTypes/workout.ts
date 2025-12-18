import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'workout',
  title: 'Workout',
  type: 'document',
  fields: [
    defineField({
      name: 'userId',
      title: 'User ID',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'startedAt',
      title: 'Started At',
      type: 'datetime',
      description: 'When the workout session was started.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'endedAt',
      title: 'Ended At',
      type: 'datetime',
      description: 'When the workout session was completed.',
    }),
    defineField({
      name: 'durationMin',
      title: 'Duration (minutes)',
      description: 'The total duration of the workout in minutes.',
      type: 'number',
      validation: (Rule) => Rule.required().positive().integer(),
    }),
    defineField({
      name: 'exercises',
      title: 'Exercises',
      type: 'array',
      of: [
        defineField({
          name: 'exerciseEntry',
          title: 'Exercise Entry',
          type: 'object',
          fields: [
            defineField({
              name: 'exercise',
              title: 'Exercise',
              type: 'reference',
              to: [{type: 'exercise'}],
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'sets',
              title: 'Sets',
              description: 'Individual set breakdown for this exercise.',
              type: 'array',
              of: [
                defineField({
                  name: 'set',
                  title: 'Set',
                  type: 'object',
                  fields: [
                    defineField({
                      name: 'reps',
                      title: 'Reps',
                      type: 'number',
                      validation: (Rule) => Rule.required().positive().integer(),
                    }),
                    defineField({
                      name: 'weight',
                      title: 'Weight',
                      type: 'number',
                      description: 'Leave empty if bodyweight.',
                    }),
                    defineField({
                      name: 'weightUnit',
                      title: 'Weight Unit',
                      type: 'string',
                      options: {
                        list: [
                          {title: 'Kilograms', value: 'kg'},
                          {title: 'Pounds', value: 'lb'},
                        ],
                        layout: 'radio',
                      },
                      initialValue: 'kg',
                    }),
                  ],
                  preview: {
                    select: {reps: 'reps', weight: 'weight', unit: 'weightUnit'},
                    prepare({reps, weight, unit}) {
                      return {
                        title: reps ? `${reps} reps` : 'Set',
                        subtitle: weight ? `${weight} ${unit || 'kg'}` : 'Bodyweight',
                      }
                    },
                  },
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ],
})
