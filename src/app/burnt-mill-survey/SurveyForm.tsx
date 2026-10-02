'use client';

import {useState, type FormEvent, type ReactNode} from 'react';
import styles from './BurntMillSurvey.module.css';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

const supportOptions = [
  ['strongly_support', 'Strongly support'],
  ['somewhat_support', 'Somewhat support'],
  ['neutral_unsure', 'Neutral or unsure'],
  ['somewhat_oppose', 'Somewhat oppose'],
  ['strongly_oppose', 'Strongly oppose'],
] as const;

const useOptions = [
  ['very_likely', 'Very likely'],
  ['somewhat_likely', 'Somewhat likely'],
  ['not_sure', 'Not sure'],
  ['somewhat_unlikely', 'Somewhat unlikely'],
  ['very_unlikely', 'Very unlikely'],
] as const;

const visitOptions = [
  ['weekly_plus', 'Once a week or more'],
  ['few_times_month', 'A few times a month'],
  ['monthly', 'About once a month'],
  ['few_times_year', 'A few times a year'],
  ['rarely', 'Rarely'],
  ['never', 'Never'],
] as const;

const experienceOptions = [
  ['regular', 'I play regularly'],
  ['occasional', 'I play occasionally'],
  ['new_interested', 'I am new to disc golf or interested in trying it'],
  ['nonplayer_interested', 'I do not currently play, but I would be interested in trying it'],
  ['nonplayer', 'I do not play disc golf'],
] as const;

const considerationOptions = [
  ['paths_safety', 'Safety around walking paths and other park users'],
  ['natural_areas', 'Protection of trees, creek, and natural areas'],
  ['existing_uses', 'Compatibility with existing park uses'],
  ['parking_access', 'Parking and access'],
  ['accessibility', 'Accessibility'],
  ['maintenance', 'Maintenance'],
  ['cost_funding', 'Cost and funding'],
] as const;

const sourceOptions = [
  ['disc_golf', 'Disc golf group or event'],
  ['neighborhood', 'Neighborhood or community group'],
  ['park_qr', 'Park sign or QR code'],
  ['social', 'Social media'],
  ['word_of_mouth', 'Friend or word of mouth'],
  ['other', 'Other'],
] as const;

export function SurveyForm() {
  const [state, setState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function submitSurvey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'submitting') return;

    const formElement = event.currentTarget;
    const data = new FormData(formElement);
    setState('submitting');
    setErrorMessage('');

    const payload = {
      support: data.get('support'),
      likelyUse: data.get('likelyUse'),
      parkVisitFrequency: data.get('parkVisitFrequency'),
      discGolfExperience: data.get('discGolfExperience'),
      considerations: data.getAll('considerations'),
      comment: data.get('comment'),
      wilmingtonResident: data.get('wilmingtonResident'),
      zipCode: data.get('zipCode'),
      source: data.get('source'),
      website: data.get('website'),
    };

    try {
      const response = await fetch('/api/burnt-mill-survey', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null) as {error?: string} | null;
      if (!response.ok) {
        setErrorMessage(result?.error || 'Your response could not be submitted. Please try again.');
        setState('error');
        return;
      }

      formElement.reset();
      setState('success');
      window.scrollTo({top: 0, behavior: 'smooth'});
    } catch {
      setErrorMessage('Your response could not be submitted. Please check your connection and try again.');
      setState('error');
    }
  }

  if (state === 'success') {
    return (
      <section className={styles.successCard} aria-live="polite">
        <div className={styles.successMark} aria-hidden="true">✓</div>
        <h2>Thank you for sharing your opinion.</h2>
        <p>Your response has been recorded and will be included in the community survey summary.</p>
      </section>
    );
  }

  return (
    <form className={styles.form} onSubmit={submitSurvey}>
      <Question number="1" title="Based on what you know today, how would you feel about installing a permanent public disc golf course at Burnt Mill Creek?" required>
        <RadioOptions name="support" options={supportOptions} />
      </Question>

      <Question number="2" title="If a permanent course were installed, how likely are you or someone in your household to use it?" required>
        <RadioOptions name="likelyUse" options={useOptions} />
      </Question>

      <Question number="3" title="How often do you currently visit Wallace Park or the Burnt Mill Creek area?" required>
        <RadioOptions name="parkVisitFrequency" options={visitOptions} />
      </Question>

      <Question number="4" title="Which best describes your experience with disc golf?" required>
        <RadioOptions name="discGolfExperience" options={experienceOptions} />
      </Question>

      <Question
        number="5"
        title="What factors, if any, should Parks & Recreation consider when evaluating the proposed course?"
        hint="Select all that apply."
      >
        <div className={styles.optionList}>
          {considerationOptions.map(([value, label]) => (
            <label className={styles.option} key={value}>
              <input type="checkbox" name="considerations" value={value} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </Question>

      <Question number="6" title="Please share any comments, concerns, or suggestions about the proposed course." hint="Optional">
        <textarea
          className={styles.textarea}
          name="comment"
          rows={5}
          maxLength={2000}
          placeholder="Your comments..."
        />
      </Question>

      <Question number="7" title="Do you live within the City of Wilmington limits?" required>
        <RadioOptions
          name="wilmingtonResident"
          options={[
            ['yes', 'Yes'],
            ['no', 'No'],
            ['not_sure', 'Not sure'],
          ]}
        />
      </Question>

      <Question number="8" title="ZIP code" required>
        <input
          className={styles.textInput}
          type="text"
          name="zipCode"
          inputMode="numeric"
          autoComplete="postal-code"
          pattern="[0-9]{5}"
          maxLength={5}
          placeholder="28401"
          required
        />
      </Question>

      <Question number="9" title="How did you hear about this survey?" hint="Optional">
        <RadioOptions name="source" options={sourceOptions} required={false} />
      </Question>

      <div className={styles.honeypot} aria-hidden="true">
        <label>
          Leave this field blank
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className={styles.submitPanel}>
        <p>
          By submitting, you confirm that these are your own responses and that you are submitting one
          response for yourself.
        </p>
        {state === 'error' ? <p className={styles.error} role="alert">{errorMessage}</p> : null}
        <button className={styles.submitButton} type="submit" disabled={state === 'submitting'}>
          {state === 'submitting' ? 'Submitting…' : 'Submit survey'}
        </button>
        <small>
          We do not ask for your name or email. A one-way technical identifier is used only to limit
          automated or repeated submissions; the site does not store your raw IP address with the survey response.
        </small>
      </div>
    </form>
  );
}

function Question({
  number,
  title,
  hint,
  required = false,
  children,
}: {
  number: string;
  title: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset className={styles.question}>
      <legend>
        <span className={styles.questionNumber}>{number}</span>
        <span>
          {title}
          {required ? <span className={styles.required}> Required</span> : null}
        </span>
      </legend>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      {children}
    </fieldset>
  );
}

function RadioOptions({
  name,
  options,
  required = true,
}: {
  name: string;
  options: readonly (readonly [string, string])[];
  required?: boolean;
}) {
  return (
    <div className={styles.optionList}>
      {options.map(([value, label], index) => (
        <label className={styles.option} key={value}>
          <input type="radio" name={name} value={value} required={required && index === 0} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}
