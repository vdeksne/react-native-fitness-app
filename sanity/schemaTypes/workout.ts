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
              description: 'The number of sets performed for this exercise.',
              type: 'number',
              validation: (Rule) => Rule.required().positive().integer(),
              options: {
                list: Array.from({length: 10}, (_, i) => i + 1).map((num) => ({
                  title: `${num} set${num > 1 ? 's' : ''}`,
                  value: num,
                })),
              },
            }),
            defineField({
              name: 'repsPerSet',
              title: 'Reps per Set',
              description: 'The number of repetitions performed in each set.',
              type: 'number',
              validation: (Rule) => Rule.required().positive().integer(),
              options: {
                list: [5, 8, 10, 12, 15, 20].map((num) => ({
                  title: `${num} reps`,
                  value: num,
                })),
              },
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
              validation: (Rule) => Rule.required(),
            }),
          ],
        }),
      ],
    }),
  ],
})
