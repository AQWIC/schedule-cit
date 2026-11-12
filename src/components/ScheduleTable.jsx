import React, { useState, useEffect, useRef } from 'react';
import { Table, TextInput, Badge, ActionIcon, Group } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { DAYS_OF_WEEK } from '../mock/initialData';
import { calculateWeeklyDelta } from '../services/api';

export function ScheduleTable({
  employees,
  onUpdateEmployee,
  onBatchUpdateDays,
  onDeleteEmployee,
}) {
  const [activeCell, setActiveCell] = useState(null);
  const [dragFill, setDragFill] = useState(null);

  // храним актуальные ссылки в ref, чтобы обработчик mouseup всегда видел свежие данные
  const dragFillRef = useRef(null);
  const employeesRef = useRef(employees);
  const onBatchUpdateDaysRef = useRef(onBatchUpdateDays);

  // синхронизируем ref со свежим списком сотрудников и колбэком
  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  useEffect(() => {
    onBatchUpdateDaysRef.current = onBatchUpdateDays;
  }, [onBatchUpdateDays]);

  // завершаем растягивание
  useEffect(() => {
    const handleMouseUp = () => {
      const currentDrag = dragFillRef.current;
      if (!currentDrag) return;

      dragFillRef.current = null;
      setDragFill(null);

      const minRow = Math.min(currentDrag.startRow, currentDrag.endRow);
      const maxRow = Math.max(currentDrag.startRow, currentDrag.endRow);
      const minCol = Math.min(currentDrag.startCol, currentDrag.endCol);
      const maxCol = Math.max(currentDrag.startCol, currentDrag.endCol);

      if (minRow === maxRow && minCol === maxCol) {
        return;
      }

      const currentEmployees = employeesRef.current;
      const updatesByEmpId = {};

      for (let r = minRow; r <= maxRow; r += 1) {
        const emp = currentEmployees[r];
        if (!emp) continue;
        const patch = {};
        for (let c = minCol; c <= maxCol; c += 1) {
          const dayKey = DAYS_OF_WEEK[c]?.key;
          if (dayKey) {
            patch[dayKey] = currentDrag.sourceValue;
          }
        }
        updatesByEmpId[emp.id] = patch;
      }

      if (Object.keys(updatesByEmpId).length > 0 && onBatchUpdateDaysRef.current) {
        onBatchUpdateDaysRef.current(updatesByEmpId);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // обновление конкретного дня
  const handleDayChange = (empId, dayKey, value) => {
    onUpdateEmployee(empId, (emp) => ({
      ...emp,
      days: {
        ...emp.days,
        [dayKey]: value,
      },
    }));
  };

  // обновляем обеда, примечания
  const handleFieldChange = (empId, field, value) => {
    onUpdateEmployee(empId, (emp) => ({
      ...emp,
      [field]: value,
    }));
  };

  // старт перетаскивания
  const handleStartDragFill = (e, empIndex, dayIndex, sourceValue) => {
    e.preventDefault();
    e.stopPropagation();
    const initialDrag = {
      startRow: empIndex,
      startCol: dayIndex,
      endRow: empIndex,
      endCol: dayIndex,
      sourceValue,
    };
    dragFillRef.current = initialDrag;
    setDragFill(initialDrag);
  };

  const handleCellMouseEnter = (empIndex, dayIndex) => {
    if (!dragFillRef.current) return;
    const nextDrag = {
      ...dragFillRef.current,
      endRow: empIndex,
      endCol: dayIndex,
    };
    dragFillRef.current = nextDrag;
    setDragFill(nextDrag);
  };

  return (
    <Table.ScrollContainer minWidth={1000}>
      <Table withTableBorder withColumnBorders highlightOnHover verticalSpacing="xs">
        <Table.Thead bg="gray.1">
          <Table.Tr>
            <Table.Th style={{ width: 50, textAlign: 'center' }}>№ п/п</Table.Th>
            <Table.Th style={{ width: 170 }}>Ф.И.О.</Table.Th>
            {DAYS_OF_WEEK.map((day) => (
              <Table.Th
                key={day.key}
                style={{
                  textAlign: 'center',
                  backgroundColor: day.isWeekend ? '#fff3bf' : undefined,
                }}
              >
                {day.label}
              </Table.Th>
            ))}
            <Table.Th style={{ width: 110, textAlign: 'center' }}>обед</Table.Th>
            <Table.Th style={{ width: 110, textAlign: 'center' }}>Примечание</Table.Th>
            <Table.Th style={{ width: 100, textAlign: 'center' }}>Отгулы</Table.Th>
            <Table.Th style={{ width: 50, textAlign: 'center' }}></Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {employees.map((emp, index) => {
            // считаем баланс и изменение отгулов за текущую неделю
            const baseBalance = Number(emp.timeOffBalance) || 0;
            const balanceColor =
              baseBalance < 0 ? 'red' : baseBalance > 0 ? 'blue' : 'gray';
            const weeklyDelta = calculateWeeklyDelta(emp.days);

            return (
              <Table.Tr key={emp.id}>
                <Table.Td style={{ textAlign: 'center', fontWeight: 500 }}>
                  {index + 1}
                </Table.Td>

                <Table.Td style={{ fontWeight: 600 }}>{emp.name}</Table.Td>

                {DAYS_OF_WEEK.map((day, dayIndex) => {
                  const val = emp.days?.[day.key] || '';
                  const cleanVal = val.trim().toLowerCase();
                  const isOff = cleanVal === 'вых';
                  const isSick = cleanVal === 'больничный';
                  const isTimeOff = cleanVal === 'отгул';
                  const isActive =
                    activeCell?.empIndex === index && activeCell?.dayIndex === dayIndex;
                  const isInFillRange = Boolean(
                    dragFill &&
                    index >= Math.min(dragFill.startRow, dragFill.endRow) &&
                    index <= Math.max(dragFill.startRow, dragFill.endRow) &&
                    dayIndex >= Math.min(dragFill.startCol, dragFill.endCol) &&
                    dayIndex <= Math.max(dragFill.startCol, dragFill.endCol)
                  );

                  return (
                    <Table.Td
                      key={day.key}
                      p={2}
                      onClick={() => setActiveCell({ empIndex: index, dayIndex })}
                      onMouseEnter={() => handleCellMouseEnter(index, dayIndex)}
                      style={{
                        position: 'relative',
                        userSelect: dragFill ? 'none' : undefined,
                        backgroundColor: isInFillRange
                          ? '#e7f5ff'
                          : day.isWeekend
                            ? '#fffde7'
                            : undefined,
                        boxShadow: isActive ? 'inset 0 0 0 2px #228be6' : undefined,
                      }}
                    >
                      <TextInput
                        size="xs"
                        variant="unstyled"
                        value={val}
                        onFocus={() => setActiveCell({ empIndex: index, dayIndex })}
                        onChange={(e) => handleDayChange(emp.id, day.key, e.target.value)}
                        styles={{
                          input: {
                            textAlign: 'center',
                            fontWeight: isOff || isSick || isTimeOff ? 600 : 400,
                            color: isOff
                              ? '#868e96'
                              : isSick
                                ? '#e8590c'
                                : isTimeOff
                                  ? '#7950f2'
                                  : '#212529',
                          },
                        }}
                      />
                      {isActive && (
                        <div
                          onMouseDown={(e) => handleStartDragFill(e, index, dayIndex, val)}
                          title="Потяните для автозаполнения"
                          style={{
                            position: 'absolute',
                            right: -2,
                            bottom: -2,
                            width: 7,
                            height: 7,
                            backgroundColor: '#228be6',
                            border: '1px solid #ffffff',
                            cursor: 'crosshair',
                            zIndex: 2,
                          }}
                        />
                      )}
                    </Table.Td>
                  );
                })}

                <Table.Td p={2}>
                  <TextInput
                    size="xs"
                    variant="unstyled"
                    placeholder="—"
                    value={emp.lunch || ''}
                    onChange={(e) => handleFieldChange(emp.id, 'lunch', e.target.value)}
                    styles={{ input: { textAlign: 'center' } }}
                  />
                </Table.Td>

                <Table.Td p={2}>
                  <TextInput
                    size="xs"
                    variant="unstyled"
                    placeholder="—"
                    value={emp.note || ''}
                    onChange={(e) => handleFieldChange(emp.id, 'note', e.target.value)}
                    styles={{ input: { textAlign: 'center', fontSize: '11px' } }}
                  />
                </Table.Td>

                <Table.Td style={{ textAlign: 'center' }}>
                  <Group gap={4} justify="center" wrap="nowrap">
                    <Badge color={balanceColor} variant="light" size="sm">
                      {baseBalance}
                    </Badge>

                    {weeklyDelta > 0 && (
                      <Badge color="teal" variant="filled" size="sm">
                        +{weeklyDelta}
                      </Badge>
                    )}

                    {weeklyDelta < 0 && (
                      <Badge color="red" variant="filled" size="sm">
                        {weeklyDelta}
                      </Badge>
                    )}
                  </Group>
                </Table.Td>

                <Table.Td style={{ textAlign: 'center' }}>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    size="sm"
                    onClick={() => onDeleteEmployee(emp.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
