import {useRef, useState, type ChangeEvent, type FormEvent} from 'react';
import type {Course} from '@/domain/course/Course';
import type {TeamFieldErrors, TeamInput} from '@/types/team';
import {TeamLogo} from '@/components/teams/TeamLogo';
import {createTeamLogoUrl} from '@/shared/utils';
import styles from './TeamManagement.module.css';

type TeamFormProps = {
  initialValues: TeamInput;
  fieldErrors: TeamFieldErrors;
  submitLabel: string;
  submitting: boolean;
  courses: Course[];
  onSubmit: (values: TeamInput) => void;
  onCancel: () => void;
};

export function TeamForm({
  initialValues,
  fieldErrors,
  submitLabel,
  submitting,
  courses,
  onSubmit,
  onCancel,
}: TeamFormProps) {
  const [values, setValues] = useState<TeamInput>(initialValues);
  const [logoError, setLogoError] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setField(field: keyof TeamInput, value: string) {
    setValues((current) => ({...current, [field]: value}));
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLogoUploading(true);
      const logo = await createTeamLogoUrl(file, values.name || values.shortName || file.name);
      setField('logo', logo);
      setLogoError('');
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : 'Logo could not be loaded.');
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function clearLogo() {
    setField('logo', '');
    setLogoError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <form className={styles.teamForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.formGrid}>
        <label>
          <span>Team name</span>
          <input
            autoFocus
            data-initial-focus
            name="name"
            value={values.name}
            onChange={(event) => setField('name', event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'team-name-error' : undefined}
          />
          {fieldErrors.name ? <small id="team-name-error" className={styles.fieldError}>{fieldErrors.name}</small> : null}
        </label>
        <label>
          <span>Short name</span>
          <input
            name="shortName"
            value={values.shortName}
            onChange={(event) => setField('shortName', event.target.value)}
            aria-invalid={Boolean(fieldErrors.shortName)}
            aria-describedby={fieldErrors.shortName ? 'team-short-name-error' : undefined}
          />
          {fieldErrors.shortName ? <small id="team-short-name-error" className={styles.fieldError}>{fieldErrors.shortName}</small> : null}
        </label>
        <label>
          <span>City</span>
          <input name="city" value={values.city} onChange={(event) => setField('city', event.target.value)} />
        </label>
        <label>
          <span>State</span>
          <input name="state" value={values.state} onChange={(event) => setField('state', event.target.value)} />
        </label>
        <label>
          <span>Captain</span>
          <input name="captain" value={values.captain} onChange={(event) => setField('captain', event.target.value)} />
        </label>
        <label>
          <span>Home course</span>
          <select name="homeCourse" value={values.homeCourse} onChange={(event) => setField('homeCourse', event.target.value)}>
            <option value="">To be announced</option>
            {courses.map((course) => (
              <option key={course.id} value={course.name}>{course.name}</option>
            ))}
          </select>
        </label>
        <div className={`${styles.fullField} ${styles.logoUploadField}`}>
          <span>Logo</span>
          <div className={styles.logoUploadControl}>
            <TeamLogo
              team={{
                id: 'logo-preview',
                active: true,
                createdAt: '',
                updatedAt: '',
                ...values,
              }}
              large
            />
            <div className={styles.logoUploadActions}>
              <input name="logo" type="url" value={values.logo} onChange={(event) => setField('logo', event.target.value)} placeholder="Logo URL or uploaded image" />
              <div className={styles.logoButtons}>
                <button type="button" className={styles.secondaryButton} onClick={() => fileInputRef.current?.click()} disabled={logoUploading}>
                  {logoUploading ? 'Uploading...' : 'Upload logo'}
                </button>
                {values.logo ? <button type="button" className={styles.secondaryButton} onClick={clearLogo}>Clear</button> : null}
              </div>
              <input ref={fileInputRef} className={styles.srOnly} type="file" accept="image/*" onChange={handleLogoUpload} />
              {logoError ? <small className={styles.fieldError}>{logoError}</small> : null}
            </div>
          </div>
        </div>
        <label>
          <span>Primary color</span>
          <span className={styles.colorControl}>
            <input type="color" value={values.primaryColor} onChange={(event) => setField('primaryColor', event.target.value)} />
            <input name="primaryColor" value={values.primaryColor} onChange={(event) => setField('primaryColor', event.target.value)} aria-label="Primary color value" />
          </span>
        </label>
        <label>
          <span>Secondary color</span>
          <span className={styles.colorControl}>
            <input type="color" value={values.secondaryColor} onChange={(event) => setField('secondaryColor', event.target.value)} />
            <input name="secondaryColor" value={values.secondaryColor} onChange={(event) => setField('secondaryColor', event.target.value)} aria-label="Secondary color value" />
          </span>
        </label>
        <label>
          <span>Website</span>
          <input name="website" type="url" value={values.website} onChange={(event) => setField('website', event.target.value)} />
        </label>
        <label>
          <span>Facebook</span>
          <input name="facebook" type="url" value={values.facebook} onChange={(event) => setField('facebook', event.target.value)} />
        </label>
        <label className={styles.fullField}>
          <span>Description</span>
          <textarea name="description" rows={4} value={values.description} onChange={(event) => setField('description', event.target.value)} />
        </label>
      </div>
      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.primaryButton} disabled={submitting || logoUploading}>
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
