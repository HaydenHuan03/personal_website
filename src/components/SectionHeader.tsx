import type { Ref } from 'react';

interface Props {
  title: string;
  subtitle: string;
  headerRef?: Ref<HTMLDivElement>;
}

export default function SectionHeader({ title, subtitle, headerRef }: Props) {
  return (
    <div ref={headerRef} data-section-header="">
      <h2 className="text-3xl font-heading font-semibold text-stone-900 mb-2 text-balance">{title}</h2>
      <p className="text-stone-500 font-light">{subtitle}</p>
    </div>
  );
}
