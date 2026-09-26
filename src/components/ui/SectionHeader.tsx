interface Props {
  title: string;
  subtitle: string;
}

export default function SectionHeader({ title, subtitle }: Props) {
  return (
    <div data-section-header="">
      <h2 className="text-3xl font-heading font-semibold text-stone-900 dark:text-stone-50 mb-2 text-balance">{title}</h2>
      <p className="text-stone-500 dark:text-stone-400 font-light">{subtitle}</p>
    </div>
  );
}
