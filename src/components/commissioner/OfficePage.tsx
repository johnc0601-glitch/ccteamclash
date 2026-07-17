import type {ReactNode} from 'react';
import {OFFICE_SECTIONS, type OfficeSectionId} from '@/shared/constants/commissioner';

type OfficePageProps = {
  sectionId: OfficeSectionId;
  children?: ReactNode;
};

export function OfficePage({sectionId, children}: OfficePageProps) {
  const section = OFFICE_SECTIONS[sectionId];

  return (
    <div className="office-page">
      <header className="office-page-header">
        <span>Commissioner Office</span>
        <h1>{section.title}</h1>
        <p>{section.description}</p>
      </header>
      {children ?? (
        <section className="office-module-frame" aria-labelledby={`${sectionId}-workspace`}>
          <span>Section framework</span>
          <h2 id={`${sectionId}-workspace`}>{section.title} workspace</h2>
          <p>Operational tools and league data will be connected in a later implementation module.</p>
        </section>
      )}
    </div>
  );
}
