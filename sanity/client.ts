import {createClient} from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

const projectId =
  process.env.EXPO_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || 'ysuysqc1'
const dataset =
  process.env.EXPO_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || 'fitness-app'
const apiVersion =
  process.env.EXPO_PUBLIC_SANITY_API_VERSION || process.env.SANITY_API_VERSION || '2023-10-12'
const token = process.env.EXPO_PUBLIC_SANITY_TOKEN || process.env.SANITY_API_TOKEN || ''

export const config = {
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // always fetch fresh for app data
}

export const client = createClient(config)

// Admin client for authenticated requests (only if token provided)
export const adminClient = token
  ? createClient({
      ...config,
      token,
      useCdn: false,
    })
  : client

// Image URL builder
const builder = imageUrlBuilder(config)
export const urlFor = (source: string) => builder.image(source)
