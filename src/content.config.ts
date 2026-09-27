import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    headline: z.string().optional(),
    datePublished: z.string(),
    dateModified: z.string().optional(),
    author: z.string().default('DecayFix Editorial Team'),
    category: z.enum(['Informational', 'Commercial', 'Guide', 'Strategy']),
    tags: z.array(z.string()).default([]),
    targetAudience: z.string().optional(),
    primaryKeyword: z.string(),
    faqs: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      )
      .default([]),
  }),
});

export const collections = {
  blog,
};
