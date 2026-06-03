import { type FormEvent } from "react";

import {
  type CandidateCv,
  type CvFormState,
  type Profile,
  type ProfileFormState,
  type User,
  profileRemoteTypeOptions,
  remoteTypeLabels
} from "./types";

type CandidateProfilePanelProps = {
  profile: Profile | null;
  activeCv: CandidateCv | null;
  profileForm: ProfileFormState;
  cvForm: CvFormState;
  user: User | null;
  isBusy: boolean;
  onCvSave: (event: FormEvent<HTMLFormElement>) => void;
  onProfileSave: (event: FormEvent<HTMLFormElement>) => void;
  onRefreshCv: () => void | Promise<unknown>;
  onRefreshProfile: () => void | Promise<unknown>;
  updateCvField: (field: keyof CvFormState, value: string) => void;
  updateProfileField: (
    field: Exclude<keyof ProfileFormState, "acceptableRemoteTypes">,
    value: string
  ) => void;
  toggleAcceptableRemoteType: (remoteType: string) => void;
};

export function CandidateProfilePanel({
  profile,
  activeCv,
  profileForm,
  cvForm,
  user,
  isBusy,
  onCvSave,
  onProfileSave,
  onRefreshCv,
  onRefreshProfile,
  updateCvField,
  updateProfileField,
  toggleAcceptableRemoteType
}: CandidateProfilePanelProps) {
  return (
    <section className="profile-panel">
      <div className="section-heading">
        <h2>Profile</h2>
        {profile ? <p className="muted">Updated {new Date(profile.updatedAt).toLocaleString()}</p> : null}
      </div>

      <form className="job-form" onSubmit={onCvSave}>
        <div className="section-heading">
          <h3>CV Source</h3>
          {activeCv ? (
            <p className="muted">
              {activeCv.sourceName || "Active CV"} updated{" "}
              {new Date(activeCv.updatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <p className="muted">
          Save CV and update profile from CV refreshes parsed CV-backed fields like profession, bio,
          roles, skills, languages, and experience. Job-search preferences such as salary range,
          remote modes, locations, and avoid skills stay manual.
        </p>
        <div className="form-grid">
          <label>
            Source type
            <input
              value={cvForm.sourceType}
              onChange={(event) => updateCvField("sourceType", event.target.value)}
            />
          </label>
          <label>
            Source name
            <input
              value={cvForm.sourceName}
              onChange={(event) => updateCvField("sourceName", event.target.value)}
            />
          </label>
          <label className="wide">
            Typst CV source
            <textarea
              value={cvForm.sourceText}
              onChange={(event) => updateCvField("sourceText", event.target.value)}
              rows={10}
            />
          </label>
        </div>
        <div className="button-row">
          <button disabled={isBusy || !user || !cvForm.sourceText.trim()} type="submit">
            Save CV and update profile from CV
          </button>
          <button disabled={isBusy || !user} type="button" onClick={() => void onRefreshCv()}>
            Refresh CV
          </button>
        </div>
      </form>

      <form className="job-form" onSubmit={onProfileSave}>
        <div className="section-heading">
          <h3>Candidate Summary</h3>
        </div>
        <p className="muted">
          The CV source describes your background. Preferences below are used as filters for scoring
          jobs.
        </p>
        <div className="form-grid">
          <label>
            Profession
            <input
              value={profileForm.profession}
              onChange={(event) => updateProfileField("profession", event.target.value)}
            />
          </label>
          <label>
            Desired salary min EUR
            <input
              value={profileForm.salaryMinEur}
              onChange={(event) => updateProfileField("salaryMinEur", event.target.value)}
              inputMode="numeric"
            />
          </label>
          <label>
            Desired salary max EUR
            <input
              value={profileForm.salaryMaxEur}
              onChange={(event) => updateProfileField("salaryMaxEur", event.target.value)}
              inputMode="numeric"
            />
          </label>
          <label className="wide">
            Salary notes
            <textarea
              value={profileForm.salaryNotes}
              onChange={(event) => updateProfileField("salaryNotes", event.target.value)}
              rows={3}
            />
          </label>
          <label>
            Preferred locations
            <textarea
              value={profileForm.preferredLocations}
              onChange={(event) => updateProfileField("preferredLocations", event.target.value)}
            />
          </label>
          <label className="wide">
            Location notes
            <textarea
              value={profileForm.locationNotes}
              onChange={(event) => updateProfileField("locationNotes", event.target.value)}
              rows={3}
            />
          </label>
          <div className="wide checkbox-group">
            <p>Acceptable remote types</p>
            <div>
              {profileRemoteTypeOptions.map((option) => (
                <label key={option}>
                  <input
                    checked={profileForm.acceptableRemoteTypes.includes(option)}
                    onChange={() => toggleAcceptableRemoteType(option)}
                    type="checkbox"
                  />
                  {remoteTypeLabels[option]}
                </label>
              ))}
            </div>
          </div>
          <label>
            German level
            <input
              value={profileForm.germanLevel}
              onChange={(event) => updateProfileField("germanLevel", event.target.value)}
            />
          </label>
          <label>
            English level
            <input
              value={profileForm.englishLevel}
              onChange={(event) => updateProfileField("englishLevel", event.target.value)}
            />
          </label>
          <label className="wide">
            Languages
            <textarea
              value={profileForm.languages}
              onChange={(event) => updateProfileField("languages", event.target.value)}
              rows={4}
            />
          </label>
          <label className="wide">
            Bio
            <textarea
              value={profileForm.bio}
              onChange={(event) => updateProfileField("bio", event.target.value)}
              rows={4}
            />
          </label>
        </div>

        <div className="section-heading">
          <h3>Skills</h3>
        </div>
        <div className="form-grid">
          <label>
            Target roles
            <textarea
              value={profileForm.targetRoles}
              onChange={(event) => updateProfileField("targetRoles", event.target.value)}
            />
          </label>

          <label>
            Strong skills
            <textarea
              value={profileForm.strongSkills}
              onChange={(event) => updateProfileField("strongSkills", event.target.value)}
            />
          </label>

          <label>
            Secondary skills
            <textarea
              value={profileForm.secondarySkills}
              onChange={(event) => updateProfileField("secondarySkills", event.target.value)}
            />
          </label>

          <label>
            Engineering skills
            <textarea
              value={profileForm.engineeringSkills}
              onChange={(event) => updateProfileField("engineeringSkills", event.target.value)}
            />
          </label>

          <label>
            AI skills
            <textarea
              value={profileForm.aiSkills}
              onChange={(event) => updateProfileField("aiSkills", event.target.value)}
            />
          </label>

          <label>
            Avoid skills
            <textarea
              value={profileForm.avoidSkills}
              onChange={(event) => updateProfileField("avoidSkills", event.target.value)}
            />
          </label>
        </div>

        <div className="section-heading">
          <h3>Experience</h3>
        </div>
        <div className="form-grid">
          <label className="wide">
            Experience summary
            <textarea
              value={profileForm.experienceSummary}
              onChange={(event) => updateProfileField("experienceSummary", event.target.value)}
              rows={5}
            />
          </label>

          <label className="wide">
            Profile notes
            <textarea
              value={profileForm.profileNotes}
              onChange={(event) => updateProfileField("profileNotes", event.target.value)}
              rows={5}
            />
          </label>
        </div>

        <div className="button-row">
          <button disabled={isBusy || !user} type="submit">
            Save profile
          </button>
          <button disabled={isBusy || !user} type="button" onClick={() => void onRefreshProfile()}>
            Refresh
          </button>
        </div>
      </form>
    </section>
  );
}
