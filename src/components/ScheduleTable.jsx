import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  TextInput,
  Badge,
  ActionIcon,
  Group,
  Popover,
  Stack,
  Text,
  Button,
  Divider,
  Box,
} from '@mantine/core';
import { IconTrash, IconClock } from '@tabler/icons-react';
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
  const [popoverCell, setPopoverCell] = useState(null);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPopoverCell(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const handleApplyPreset = (empId, dayKey, value) => {
    handleDayChange(empId, dayKey, value);
    setPopoverCell(null);
  };

  const stepTime = (timeStr, deltaMinutes, defaultTime = '8.00') => {
    const raw = (timeStr || '').trim() || defaultTime;
    const normalized = raw.replace(':', '.');
    const parts = normalized.split('.');
    let hours = parseInt(parts[0], 10);
    let minutes = parseInt(parts[1] || '0', 10);

    if (isNaN(hours)) hours = 8;
    if (isNaN(minutes)) minutes = 0;

    let totalMinutes = hours * 60 + minutes + deltaMinutes;
    if (totalMinutes < 0) totalMinutes = 0;
    if (totalMinutes > 23 * 60 + 30) totalMinutes = 23 * 60 + 30;

    const resH = Math.floor(totalMinutes / 60);
    const resM = totalMinutes % 60;
    const resMStr = resM < 10 ? `0${resM}` : `${resM}`;
    return `${resH}.${resMStr}`;
  };

  const handleApplyCustomTime = (empId, dayKey) => {
    const from = customFrom.trim();
    const to = customTo.trim();
    if (from && to) {
      handleDayChange(empId, dayKey, `${from}-${to}`);
    } else if (from || to) {
      handleDayChange(empId, dayKey, from || to);
    }
    setCustomFrom('');
    setCustomTo('');
    setPopoverCell(null);
  };

  return (
    <Table.ScrollContainer minWidth={1100}>
      <Table
        withTableBorder
        withColumnBorders
        highlightOnHover
        verticalSpacing="xs"
        style={{ tableLayout: 'fixed', width: '100%' }}
      >
        <Table.Thead bg="gray.1">
          <Table.Tr>
            <Table.Th style={{ width: 45, textAlign: 'center' }}>№ п/п</Table.Th>
            <Table.Th style={{ width: 160 }}>Ф.И.О.</Table.Th>
            {DAYS_OF_WEEK.map((day) => (
              <Table.Th
                key={day.key}
                style={{
                  width: 92,
                  textAlign: 'center',
                  backgroundColor: day.isWeekend ? '#fff3bf' : undefined,
                }}
              >
                {day.label}
              </Table.Th>
            ))}
            <Table.Th style={{ width: 95, textAlign: 'center' }}>обед</Table.Th>
            <Table.Th style={{ width: 100, textAlign: 'center' }}>Примечание</Table.Th>
            <Table.Th style={{ width: 85, textAlign: 'center' }}>Отгулы</Table.Th>
            <Table.Th style={{ width: 45, textAlign: 'center' }}></Table.Th>
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
                  const isPopoverOpen =
                    popoverCell?.empIndex === index && popoverCell?.dayIndex === dayIndex;
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
                          ? '#d0ebff'
                          : day.isWeekend
                            ? '#fffde7'
                            : undefined,
                        boxShadow: isInFillRange
                          ? 'inset 0 0 0 2px #1971c2'
                          : isActive
                            ? 'inset 0 0 0 2px #228be6'
                            : undefined,
                        transition: 'background-color 0.08s ease, box-shadow 0.08s ease',
                      }}
                    >
                      <Group gap={0} wrap="nowrap" align="center" style={{ width: '100%', pointerEvents: dragFill ? 'none' : undefined }}>
                        <TextInput
                          size="xs"
                          variant="unstyled"
                          value={val}
                          onFocus={() => setActiveCell({ empIndex: index, dayIndex })}
                          onChange={(e) => handleDayChange(emp.id, day.key, e.target.value)}
                          styles={{
                            root: { flex: 1, minWidth: 0 },
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
                              padding: '0 2px',
                            },
                          }}
                        />

                        <Popover
                          opened={isPopoverOpen}
                          onChange={(opened) => {
                            if (!opened) {
                              setPopoverCell(null);
                            }
                          }}
                          position="bottom"
                          withArrow
                          shadow="xl"
                          width={260}
                          withinPortal
                        >
                          <Popover.Target>
                            <ActionIcon
                              size={16}
                              variant="subtle"
                              color="gray"
                              style={{ opacity: 0.6, flexShrink: 0, marginRight: 2 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveCell({ empIndex: index, dayIndex });
                                if (isPopoverOpen) {
                                  setPopoverCell(null);
                                } else {
                                  const parts = val.split('-');
                                  setCustomFrom(parts[0] || '');
                                  setCustomTo(parts[1] || '');
                                  setPopoverCell({ empIndex: index, dayIndex });
                                }
                              }}
                            >
                              <IconClock size={12} />
                            </ActionIcon>
                          </Popover.Target>

                          <Popover.Dropdown
                            p={0}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              border: '1px solid #ced4da',
                              borderRadius: '8px',
                              overflow: 'hidden',
                            }}
                          >
                            <Box bg="gray.1" px="xs" py={6} style={{ borderBottom: '1px solid #e9ecef' }}>
                              <Text size="xs" fw={700} c="dark.4">
                                Выбор смены / статуса
                              </Text>
                            </Box>

                            <Stack gap={6} p="xs">
                              <div>
                                <Text size="xs" c="dimmed" fw={600} mb={4}>
                                  Статусы:
                                </Text>
                                <Group gap={4} wrap="wrap">
                                  <Button
                                    size="compact-xs"
                                    variant="light"
                                    color="gray"
                                    onClick={() => handleApplyPreset(emp.id, day.key, 'Вых')}
                                  >
                                    Вых
                                  </Button>
                                  <Button
                                    size="compact-xs"
                                    variant="light"
                                    color="grape"
                                    onClick={() => handleApplyPreset(emp.id, day.key, 'Отгул')}
                                  >
                                    Отгул
                                  </Button>
                                  <Button
                                    size="compact-xs"
                                    variant="light"
                                    color="orange"
                                    onClick={() => handleApplyPreset(emp.id, day.key, 'Больничный')}
                                  >
                                    Больничный
                                  </Button>
                                </Group>
                              </div>

                              <Divider my={2} />

                              <div>
                                <Text size="xs" c="dimmed" fw={600} mb={4}>
                                  Готовые смены:
                                </Text>
                                <Group gap={4} wrap="wrap">
                                  <Button
                                    size="compact-xs"
                                    variant="light"
                                    color="blue"
                                    onClick={() => handleApplyPreset(emp.id, day.key, '8.00-17.00')}
                                  >
                                    8.00-17.00
                                  </Button>
                                  <Button
                                    size="compact-xs"
                                    variant="light"
                                    color="blue"
                                    onClick={() => handleApplyPreset(emp.id, day.key, '8.30-17.30')}
                                  >
                                    8.30-17.30
                                  </Button>
                                  <Button
                                    size="compact-xs"
                                    variant="light"
                                    color="blue"
                                    onClick={() => handleApplyPreset(emp.id, day.key, '14.00-21.00')}
                                  >
                                    14.00-21.00
                                  </Button>
                                  <Button
                                    size="compact-xs"
                                    variant="light"
                                    color="blue"
                                    onClick={() => handleApplyPreset(emp.id, day.key, '7.45-15.45')}
                                  >
                                    7.45-15.45
                                  </Button>
                                </Group>
                              </div>

                              <Divider my={2} />

                              <div>
                                <Text size="xs" c="dimmed" fw={600} mb={4}>
                                  Свое время:
                                </Text>
                                <Group gap={6} wrap="nowrap" align="center">
                                  <TextInput
                                    size="xs"
                                    placeholder="8.00"
                                    value={customFrom}
                                    onChange={(e) => setCustomFrom(e.target.value)}
                                    onWheel={(e) => {
                                      e.preventDefault();
                                      const delta = e.deltaY < 0 ? 15 : -15;
                                      setCustomFrom((prev) => stepTime(prev, delta, '8.00'));
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleApplyCustomTime(emp.id, day.key);
                                      }
                                    }}
                                    style={{ width: 68 }}
                                    styles={{ input: { textAlign: 'center', padding: '0 4px', height: 30 } }}
                                  />
                                  <Text size="xs" c="dimmed">-</Text>
                                  <TextInput
                                    size="xs"
                                    placeholder="17.00"
                                    value={customTo}
                                    onChange={(e) => setCustomTo(e.target.value)}
                                    onWheel={(e) => {
                                      e.preventDefault();
                                      const delta = e.deltaY < 0 ? 15 : -15;
                                      setCustomTo((prev) => stepTime(prev, delta, '17.00'));
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleApplyCustomTime(emp.id, day.key);
                                      }
                                    }}
                                    style={{ width: 68 }}
                                    styles={{ input: { textAlign: 'center', padding: '0 4px', height: 30 } }}
                                  />
                                  <Button
                                    size="xs"
                                    color="blue"
                                    style={{ height: 30, minWidth: 54 }}
                                    ml="auto"
                                    onClick={() => handleApplyCustomTime(emp.id, day.key)}
                                  >
                                    ОК
                                  </Button>
                                </Group>
                              </div>
                            </Stack>
                          </Popover.Dropdown>
                        </Popover>
                      </Group>

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
