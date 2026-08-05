// Custom hook for auto-fill logic
export const useAutoFill = (
  splitUserIds: string[],
  values: { [userId: string]: number },
  setValues: (values: { [userId: string]: number }) => void,
  total: number
) => {
  const handleAutoFill = (userId: string, newValue: number) => {
    const updatedValues = { ...values, [userId]: newValue };
    
    // Auto-fill logic: if exactly one field is empty or zero, fill it
    const filledIds = splitUserIds.filter(
      (id) =>
        id !== userId && // Don't count the field being edited
        updatedValues[id] !== undefined &&
        updatedValues[id] !== null &&
        !isNaN(updatedValues[id]) &&
        updatedValues[id] > 0
    );
    const emptyIds = splitUserIds.filter(
      (id) =>
        id !== userId && // Don't count the field being edited
        (updatedValues[id] === undefined ||
        updatedValues[id] === null ||
        isNaN(updatedValues[id]) ||
        updatedValues[id] <= 0)
    );

    // Only auto-fill if exactly one field is empty and the current value is > 0
    if (emptyIds.length === 1 && newValue > 0) {
      const filledTotal = filledIds.reduce(
        (sum, id) => sum + (updatedValues[id] || 0),
        0
      ) + newValue; // Include the current field being edited
      const remaining = Math.round((total - filledTotal) * 100) / 100;
      if (remaining >= 0 && remaining <= total) {
        updatedValues[emptyIds[0]] = remaining;
      }
    }
    
    setValues(updatedValues);
  };

  const resetToEqual = () => {
    // precision-safe equal distribution
    const equalValue = Math.round((total / splitUserIds.length) * 100) / 100;
    const newValues: { [userId: string]: number } = {};
    
    splitUserIds.forEach((userId, index) => {
      if (index === splitUserIds.length - 1) {
        // Last user gets the remainder to ensure exact total
        const othersTotal = (splitUserIds.length - 1) * equalValue;
        const remainingValue = Math.round((total - othersTotal) * 100) / 100;
        newValues[userId] = remainingValue;
      } else {
        newValues[userId] = equalValue;
      }
    });
    
    setValues(newValues);
  };

  return { handleAutoFill, resetToEqual };
};
