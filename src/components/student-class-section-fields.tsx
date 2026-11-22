
"use client";

import { useState } from "react";

type ClassOption = {
  id: number;
  name: string;
};

type SectionOption = {
  id: number;
  classId: number;
  name: string;
};

type StudentClassSectionFieldsProps = {
  classes: ClassOption[];
  sections: SectionOption[];
  defaultClassId?: number | null;
  defaultSectionId?: number | null;
};

export default function StudentClassSectionFields({
  classes,
  sections,
  defaultClassId = null,
  defaultSectionId = null,
}: StudentClassSectionFieldsProps) {
  const [selectedClass, setSelectedClass] = useState(
    defaultClassId === null ? "" : String(defaultClassId)
  );

  const [selectedSection, setSelectedSection] = useState(() => {
    const validSection = sections.find(
      (section) =>
        section.id === defaultSectionId &&
        section.classId === defaultClassId
    );

    return validSection ? String(validSection.id) : "";
  });

  const availableSections = sections.filter(
    (section) => String(section.classId) === selectedClass
  );

  function handleClassChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    setSelectedClass(event.target.value);
    setSelectedSection("");
  }

  function handleSectionChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    setSelectedSection(event.target.value);
  }

  return (
    <>
      <label className="block">
        <span className="lbl">Class</span>

        <select
          name="classId"
          className="inp"
          value={selectedClass}
          onChange={handleClassChange}
          required
        >
          <option value="">Select class</option>

          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="lbl">Section</span>

        <select
          name="sectionId"
          className="inp"
          value={selectedSection}
          onChange={handleSectionChange}
          disabled={!selectedClass || availableSections.length === 0}
          required
        >
          <option value="">Select section</option>

          {availableSections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
