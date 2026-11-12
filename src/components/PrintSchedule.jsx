import React from 'react';
import { DAYS_OF_WEEK, INITIAL_SIGNATORIES } from '../mock/initialData';
import { formatDateRu } from '../utils/dateUtils';

export function PrintSchedule({ employees, currentMonday, currentSunday, signDate }) {
  const startDateStr = formatDateRu(currentMonday);
  const endDateStr = formatDateRu(currentSunday);

  return (
    <div className="print-only">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
        <div style={{ textAlign: 'left', width: '270px', fontSize: '11pt' }}>
          <div><strong>Утверждаю</strong></div>
          <div>Ректор УО «ВГТУ»</div>
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'flex-end' }}>
            <span style={{ borderBottom: '1px solid #000', width: '120px', display: 'inline-block' }}></span>
            <span style={{ marginLeft: '8px' }}>{INITIAL_SIGNATORIES.rector}</span>
          </div>
          <div style={{ marginTop: '6px' }}>
            «<span style={{ textDecoration: 'underline', padding: '0 8px' }}>&nbsp;&nbsp;&nbsp;&nbsp;</span>»&nbsp;
            <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '80px' }}></span>&nbsp;
            2026 г.
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <div style={{ fontSize: '13pt', fontWeight: 'bold' }}>
          График работы сотрудников ЦИТ
        </div>
        <div style={{ fontSize: '12pt', fontWeight: 'bold', marginTop: '4px' }}>
          с {startDateStr} г. по {endDateStr} г.
        </div>
      </div>

      <table className="print-table">
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th style={{ width: '35px', textAlign: 'center' }}>№<br />п/п</th>
            <th style={{ width: '170px', textAlign: 'center' }}>Ф.И.О.</th>
            {DAYS_OF_WEEK.map((d) => (
              <th key={d.key} style={{ textAlign: 'center' }}>
                {d.label}
              </th>
            ))}
            <th style={{ width: '90px', textAlign: 'center' }}>обед</th>
            <th style={{ width: '80px', textAlign: 'center' }}>подпись</th>
            <th style={{ width: '90px', textAlign: 'center' }}>Примечание</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp, index) => (
            <tr key={emp.id}>
              <td style={{ textAlign: 'center' }}>{index + 1}</td>
              <td style={{ paddingLeft: '6px' }}>{emp.name}</td>

              {DAYS_OF_WEEK.map((d) => (
                <td key={d.key} style={{ textAlign: 'center', fontSize: '9.5pt' }}>
                  {emp.days?.[d.key] || 'Вых'}
                </td>
              ))}

              <td style={{ textAlign: 'center', fontSize: '9pt' }}>
                {emp.lunch || ''}
              </td>

              <td></td>

              <td style={{ textAlign: 'center', fontSize: '9pt' }}>
                {emp.note || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-footer" style={{ fontSize: '11pt', maxWidth: '620px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '270px 130px auto', alignItems: 'flex-end', marginBottom: '4px' }}>
          <div><strong>Начальник ЦИТ</strong></div>
          <div style={{ borderBottom: '1px solid #000', height: '18px', width: '110px' }}></div>
          <div style={{ paddingLeft: '15px' }}>{INITIAL_SIGNATORIES.headOfCit}</div>
        </div>

        <div style={{ paddingLeft: '20px', marginBottom: '18px', fontSize: '10pt' }}>
          {signDate || INITIAL_SIGNATORIES.dateCit}
        </div>

        <div>
          <div style={{ marginBottom: '10px' }}><strong>Согласовано:</strong></div>

          <div style={{ display: 'grid', gridTemplateColumns: '270px 130px auto', alignItems: 'flex-end', marginBottom: '14px' }}>
            <div style={{ lineHeight: 1.25 }}>
              Начальник центра по организационно-правовой<br />
              и кадровой работе
            </div>
            <div style={{ borderBottom: '1px solid #000', height: '18px', width: '110px' }}></div>
            <div style={{ paddingLeft: '15px' }}>{INITIAL_SIGNATORIES.headOfHr}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '270px 130px auto', alignItems: 'flex-end' }}>
            <div style={{ lineHeight: 1.25 }}>
              Председатель профкома<br />
              работников
            </div>
            <div style={{ borderBottom: '1px solid #000', height: '18px', width: '110px' }}></div>
            <div style={{ paddingLeft: '15px' }}>{INITIAL_SIGNATORIES.tradeUnion}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
