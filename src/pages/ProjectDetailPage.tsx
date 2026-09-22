import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import InlineMarkup from '../components/InlineMarkup';
import ImageLightbox from '../components/ImageLightbox';
import { getProjectBySlug } from '../data/projects';
import { techIconMap } from '../utils/techIcons';

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const project = slug ? getProjectBySlug(slug) : undefined;

  useEffect(() => {
    if (project) document.title = `${project.title} - Hayden Huan`;
    return () => {
      document.title = 'Hayden Huan - Backend Engineer & Infrastructure Developer';
    };
  }, [project]);

  if (!project) {
    return (
      <>
        <Navbar />
        <main id="main-content" className="max-w-3xl mx-auto px-6 md:px-12 pb-24 pt-12 md:pt-20">
          <h1 className="text-3xl font-heading font-semibold text-stone-900 mb-4">Project not found</h1>
          <Link to="/" className="text-stone-600 hover:text-stone-900 underline">Return to portfolio</Link>
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
            <h1 className="text-4xl md:text-5xl font-heading font-semibold text-stone-900 mb-4 leading-[1.1] text-balance">
              {project.title}
            </h1>
            {project.inProgress && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full border border-amber-200 uppercase tracking-wide">
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 text-stone-700 text-sm rounded-md font-medium border border-stone-200"
                  >
                    {iconClass && <i className={`${iconClass} text-base leading-none`} />}
                    {t}
                  </span>
                );
              })}
            </div>
            <p className="text-xl text-stone-600 font-light leading-relaxed text-justify">{project.description}</p>
          </div>

          <div className="mb-16">
            {project.content.map((block, index) => {
              switch (block.type) {
                case 'heading':
                  return (
                    <h2
                      key={index}
                      className="font-heading font-semibold text-xl text-stone-900 mt-12 mb-4 first:mt-0"
                    >
                      {block.text}
                    </h2>
                  );
                case 'list':
                  return (
                    <ul key={index} className="space-y-3 mb-6">
                      {block.items.map((item, i) => (
                        <li key={i} className="flex gap-3 text-stone-700 leading-relaxed font-light text-lg">
                          <span className="text-stone-400 mt-1 select-none" aria-hidden="true">▹</span>
                          <span><InlineMarkup text={item} /></span>
                        </li>
                      ))}
                    </ul>
                  );
                case 'paragraph':
                  return (
                    <p key={index} className="text-stone-700 leading-relaxed mb-6 font-light text-lg text-justify">
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
                    <figcaption className="font-heading font-semibold text-lg text-stone-900 mb-4">
                      {image.caption}
                    </figcaption>
                  )}
                  <ImageLightbox
                    src={image.src}
                    alt={image.alt}
                    className="w-full rounded-xl border border-stone-200 bg-white"
                  />
                </figure>
              ))}
            </section>
          )}

          <div className="p-8 bg-stone-100 rounded-xl border border-stone-200">
            <h3 className="font-heading font-semibold text-lg mb-4 text-stone-900">
              Key Architectural Highlights
            </h3>
            <ul className="space-y-4">
              {project.highlights.map((highlight, index) => (
                <li key={index} className="flex gap-4 text-stone-700">
                  <span className="text-stone-400 mt-1">▹</span>
                  <span className="leading-relaxed"><InlineMarkup text={highlight} /></span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-16 pt-8 border-t border-stone-200 flex justify-center">
            <Link
              to="/"
              className="px-6 py-3 bg-stone-900 text-stone-50 rounded-md hover:bg-stone-800 transition-colors font-medium text-sm"
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
