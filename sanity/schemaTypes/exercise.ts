import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'exercise',
  title: 'Exercise',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      description: 'The name of the exercise.',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      description: 'A short summary or explanation of the exercise.',
      type: 'text',
    }),
    defineField({
      name: 'majorMuscleGroups',
      title: 'Major Muscle Groups',
      description:
        'Select the primary muscle groups targeted by this exercise. You can select multiple.',
      type: 'array',
      of: [
        {
          type: 'string',
        },
      ],
      options: {
        list: [
          // Lower Body & Glutes
          {title: 'Glutes (Gluteus Maximus)', value: 'gluteusMaximus'},
          {title: 'Glutes (Gluteus Medius)', value: 'gluteusMedius'},
          {title: 'Posterior Chain (Gluteus Maximus / Hamstrings)', value: 'posteriorChain'},
          {title: 'Hamstrings', value: 'hamstrings'},
          {title: 'Adductors (Inner Thigh)', value: 'adductorsInnerThigh'},
          {title: 'Quadriceps (Quads)', value: 'quadriceps'},
          {title: 'Calves (Gastrocnemius/Soleus)', value: 'calves'},
          // Shoulders and Arms
          {title: 'Shoulders (Deltoids)', value: 'deltoids'},
          {title: 'Shoulders (Anterior Deltoid)', value: 'anteriorDeltoid'},
          {title: 'Arms (Triceps)', value: 'triceps'},
          {title: 'Arms (Biceps)', value: 'biceps'},
          // Chest and variations
          {title: 'Chest (Pectoralis Major - Upper)', value: 'pecMajorUpper'},
          {title: 'Chest (Pectoralis Major - Mid)', value: 'pecMajorMid'},
          {title: 'Chest (Pectoralis Major - Lower)', value: 'pecMajorLower'},
          {title: 'Chest (Pectoralis Minor)', value: 'pecMinor'},
          // Back
          {title: 'Back (Latissimus Dorsi)', value: 'latissimusDorsi'},
          {title: 'Back (Rhomboids)', value: 'rhomboids'},
          {title: 'Back (Lower Back)', value: 'lowerBack'},
          // Abs and Core
          {title: 'Core (Lower Abs)', value: 'lowerAbs'},
          {title: 'Core (Upper Abs)', value: 'upperAbs'},
          {title: 'Core (Obliques)', value: 'obliques'},
          {title: 'Core (Transverse Abdominis)', value: 'transverseAbdominis'},
        ],
      },
      validation: (Rule) => Rule.required().min(1).unique(),
    }),
    defineField({
      name: 'trainingDays',
      title: 'Training Days',
      description:
        'Assign one or more common gym Training Days (Workout Days) that this exercise is typically used in.',
      type: 'array',
      of: [
        {
          type: 'string',
        },
      ],
      options: {
        list: [
          {title: 'Legs & Glutes Day', value: 'legsGlutesDay'},
          {title: 'Shoulders & Arms Day', value: 'shouldersArmsDay'},
          {title: 'Back Day', value: 'backDay'},
          {title: 'Chest & Arms Day', value: 'chestArmsDay'},
          {title: 'Glutes & Hamstrings Day', value: 'glutesHamstringsDay'},
          {title: 'Abs / Core Day', value: 'absCoreDay'},
        ],
      },
      validation: (Rule) => Rule.required().min(1).unique(),
    }),
    defineField({
      name: 'image',
      title: 'Image',
      description: 'A representative image demonstrating the exercise.',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      description: 'A video demonstrating how to properly perform the exercise.',
      type: 'url',
    }),
    defineField({
      name: 'isActive',
      title: 'Is Active',
      description: 'Indicates if this exercise should currently be available for use.',
      type: 'boolean',
      initialValue: true,
    }),
  ],
})
