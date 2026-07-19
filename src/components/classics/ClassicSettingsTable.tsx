import React from "react";
import { ClassicTooltip } from "./ClassicTooltip";

export interface SettingsField {
  id?: string;
  label: string | React.ReactNode;
  tooltip?: string;
  render: () => React.ReactNode;
}

export interface ClassicSettingsTableProps {
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  fields: SettingsField[];
  className?: string;
}

/**
 * WordPress settings page layout using `form-table`.
 * Labels on the left, inputs on the right — like WooCommerce > Settings.
 * Supports a section title, description, and field tooltips natively.
 */
export const ClassicSettingsTable: React.FC<ClassicSettingsTableProps> = ({
  title,
  description,
  fields,
  className = "",
}) => {
  return (
    <div className={`lb-settings-section ${className}`}>
      {title && <h2 className="lb-ignore-preflight">{title}</h2>}
      {description && <p className="description ">{description}</p>}

      <table className="form-table">
        <tbody>
          {fields.map((field, index) => (
            <tr key={field.id || index}>
              <th scope="row">
                <label
                  htmlFor={field.id}
                  className="!lb-flex lb-items-center"
                >
                  <span className="lb-w-full">{field.label}</span>
                  {field.tooltip && (
                    <ClassicTooltip
                      tip={field.tooltip}
                      className="lb-ml-1"
                    />
                  )}
                </label>
              </th>
              <td>{field.render()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
