import { Link, useParams } from 'react-router';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import InlineMarkup from '@/components/ui/InlineMarkup';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { getProjectBySlug } from '@/data/projects';
import { techIconMap } from '@/lib/techIcons';
import type { Route } from './+types/ProjectDetailPage';

// Unknown slugs keep the site title from root.
export const meta: Route.MetaFunction = ({ params, matches }) => {
  const project = getProjectBySlug(params.slug);
  return project ? [{ title: `${project.title} - Hayden Huan` }] : matches[0].meta;
};

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const project = slug ? getProjectBySlug(slug) : undefined;

  if (!project) {
    return (
      <>
        <Navbar />
        <main id="main-content" className="max-w-3xl mx-auto px-6 md:px-12 pb-24 pt-12 md:pt-20">
          <h1 className="text-3xl font-heading font-semibold text-stone-900 dark:text-stone-50 mb-4">Project not found</h1>
          <Link to="/" className="text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-50 underline">Return to portfolio</Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main id="main-content" className="max-w-3xl mx-auto px-6 md:px-12 pb-24 pt-12 md:pt-20">
        <article className="animate-[fadeInUp_0.5s_ease-out]">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-heading font-semibold text-stone-900 dark:text-stone-50 mb-4 leading-[1.1] text-balance">
              {project.title}
            </h1>
            {project.inProgress && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-900 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                In Progress
              </span>
            )}
            <div className="flex flex-wrap gap-2 mb-8">
              {project.tech.map((t) => {
                const iconClass = techIconMap[t];
                return (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-sm rounded-md font-medium border border-stone-200 dark:border-stone-800"
                  >
                    {iconClass && <i className={`${iconClass} text-base leading-none`} />}
                    {t}
                  </span>
                );
              })}
            </div>
            <p className="text-xl text-stone-600 dark:text-stone-400 font-light leading-relaxed text-justify">{project.description}</p>
          </div>

          <div className="mb-16">
            {project.content.map((block, index) => {
              switch (block.type) {
                case 'heading':
                  return (
                    <h2
                      key={index}
                      className="font-heading font-semibold text-xl text-stone-900 dark:text-stone-50 mt-12 mb-4 first:mt-0"
                    >
                      {block.text}
                    </h2>
                  );
                case 'list':
                  return (
                    <ul key={index} className="space-y-3 mb-6">
                      {block.items.map((item, i) => (
                        <li key={i} className="flex gap-3 text-stone-700 dark:text-stone-300 leading-relaxed font-light text-lg">
                          <span className="text-stone-400 dark:text-stone-500 mt-1 select-none" aria-hidden="true">▹</span>
                          <span><InlineMarkup text={item} /></span>
                        </li>
                      ))}
                    </ul>
                  );
                case 'paragraph':
                  return (
                    <p key={index} className="text-stone-700 dark:text-stone-300 leading-relaxed mb-6 font-light text-lg text-justify">
                      <InlineMarkup text={block.text} />
                    </p>
                  );
              }
            })}
          </div>

          {project.images && project.images.length > 0 && (
            <section className="mb-16 space-y-10" aria-label="Project figures">
              {project.images.map((image) => (
                <figure key={image.src}>
                  {image.caption && (
                    <figcaption className="font-heading font-semibold text-lg text-stone-900 dark:text-stone-50 mb-4">
                      {image.caption}
                    </figcaption>
                  )}
                  <ImageLightbox
                    src={image.src}
                    alt={image.alt}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white"
                  />
                </figure>
              ))}
            </section>
          )}

          <div className="p-8 bg-stone-100 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800">
            <h3 className="font-heading font-semibold text-lg mb-4 text-stone-900 dark:text-stone-50">
              Key Architectural Highlights
            </h3>
            <ul className="space-y-4">
              {project.highlights.map((highlight, index) => (
                <li key={index} className="flex gap-4 text-stone-700 dark:text-stone-300">
                  <span className="text-stone-400 dark:text-stone-500 mt-1">▹</span>
                  <span className="leading-relaxed"><InlineMarkup text={highlight} /></span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-16 pt-8 border-t border-stone-200 dark:border-stone-800 flex justify-center">
            <Link
              to="/"
              className="px-6 py-3 bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 rounded-md hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors font-medium text-sm"
            >
              Return to Portfolio
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
