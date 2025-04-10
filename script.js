document.addEventListener('DOMContentLoaded', () => {
    const menuScreen = document.getElementById('menuScreen');
    const gameScreen = document.getElementById('gameScreen');
    const winPopup = document.getElementById('winPopup');

    const sizeSelector = document.getElementById('sizeSelector');
    const sizeButtons = document.querySelectorAll('.sizeButton');
    const startButton = document.getElementById('startButton');

    const backButton = document.getElementById('backButton');
    const timerDisplay = document.getElementById('timer');
    const gridContainer = document.getElementById('gridContainer');
    const numberInputsContainer = document.querySelector('.number-inputs');
    const noteToggleButton = document.getElementById('noteToggle');
    const clearCellButton = document.getElementById('clearCellButton');
    const clearButton = document.getElementById('clearButton');
    const checkButton = document.getElementById('checkButton');
    const undoButton = document.getElementById('undoButton');
    const redoButton = document.getElementById('redoButton');

    const winDetails = document.getElementById('winDetails');
    const winTime = document.getElementById('winTime');
    const winBackToMenuButton = document.getElementById('winBackToMenuButton');

    let currentSize = 0;
    let gridData = [];
    let cages = [];
    let solution = [];
    let selectedCellCoords = null;
    let isNoteMode = false;
    let timerInterval = null;
    let startTime = 0;
    let elapsedTime = 0;
    let history = [];
    let historyIndex = -1;


    function showScreen(screenToShow) {
        menuScreen.classList.add('hidden');
        gameScreen.classList.add('hidden');

        if (screenToShow === 'menu') {
            menuScreen.classList.remove('hidden');
        } else if (screenToShow === 'game') {
            gameScreen.classList.remove('hidden');
        }
    }


    sizeButtons.forEach(button => {
        button.addEventListener('click', () => {
            sizeButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            currentSize = parseInt(button.dataset.size);
            startButton.disabled = false;
        });
    });

    startButton.addEventListener('click', () => {
        if (currentSize > 0) {
            startGame(currentSize);
        }
    });


    function goBackToMenu() {
        stopTimer();
        winPopup.classList.add('hidden');
        showScreen('menu');
        resetGame();
    }

    backButton.addEventListener('click', goBackToMenu);
    winBackToMenuButton.addEventListener('click', goBackToMenu);


    function resetGame() {
        currentSize = 0;
        gridData = [];
        cages = [];
        solution = [];
        selectedCellCoords = null;
        isNoteMode = false;
        noteToggleButton.classList.remove('active');
        elapsedTime = 0;
        history = [];
        historyIndex = -1;
        updateUndoRedoButtons();
        gridContainer.innerHTML = '';
        numberInputsContainer.innerHTML = '';
        timerDisplay.textContent = 'Time : 00:00';
        sizeButtons.forEach(btn => btn.classList.remove('selected'));
        startButton.disabled = true;
    }

    function startGame(size) {
        resetGame();
        currentSize = size;
        resetTimer();
        generateAndSetupPuzzle(size);
        setupNumberInputs(size);
        showScreen('game');
        startTimer();
        saveState();
    }

    function generateAndSetupPuzzle(size) {
        let attempts = 0;
        const MAX_ATTEMPTS = 20;

        while (attempts < MAX_ATTEMPTS) {
             attempts++;
             console.log(`Generating puzzle attempt ${attempts}...`);
             solution = generateLatinSquare(size);
             cages = generateCages(size, solution);

             if (cages) {
                 gridData = createGridData(size);
                 if (gridData) {
                     createGridUI(size);
                     applyCageStyles();
                     console.log("Puzzle generation successful.");
                     return;
                 } else {
                      console.warn(`Grid data creation failed on attempt ${attempts}. Retrying...`);
                 }
             } else {
                 console.warn(`Cage generation failed validation on attempt ${attempts}. Retrying...`);
             }
        }

        console.error("FATAL: Could not generate a valid puzzle after multiple attempts.");
        alert("Error: Failed to generate a valid puzzle. Please try selecting the size again.");
        goBackToMenu();
    }


    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function generateLatinSquare(size) {
        const puzzle = Array.from({ length: size }, () => Array(size).fill(0));
        const nums = Array.from({ length: size }, (_, i) => i + 1);

        function isValid(row, col, num) {
            for (let x = 0; x < size; x++) {
                if (puzzle[row][x] === num || puzzle[x][col] === num) return false;
            }
            return true;
        }

        function solve() {
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (puzzle[r][c] === 0) {
                        const shuffledNums = shuffle([...nums]);
                        for (const num of shuffledNums) {
                            if (isValid(r, c, num)) {
                                puzzle[r][c] = num;
                                if (solve()) return true;
                                puzzle[r][c] = 0;
                            }
                        }
                        return false;
                    }
                }
            }
            return true;
        }
        solve();
        return puzzle;
    }

    function generateCages(size, sol) {
        const newCages = [];
        let cageIdCounter = 0;
        const visited = Array.from({ length: size }, () => Array(size).fill(false));
        const allCoords = [];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                allCoords.push({ r, c });
            }
        }
        shuffle(allCoords);

        let singleCellCageCount = 0;
        const maxSingleCellCages = size === 4 ? 1 : size === 5 ? 2 : 3;
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        const deferredCells = [];

        for (const startCoord of allCoords) {
            const { r: startR, c: startC } = startCoord;

            if (!visited[startR][startC]) {
                const minTargetSize = (singleCellCageCount >= maxSingleCellCages) ? 2 : 1;

                if (minTargetSize === 2) {
                    let hasUnvisitedNeighbor = false;
                    for (const [dr, dc] of directions) {
                         const nr = startR + dr;
                         const nc = startC + dc;
                         if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
                             hasUnvisitedNeighbor = true;
                             break;
                         }
                    }
                    if (!hasUnvisitedNeighbor) {
                        console.log(`Deferring isolated cell {${startR},${startC}} requiring size >= 2.`);
                        deferredCells.push(startCoord);
                        continue;
                    }
                }

                visited[startR][startC] = true;
                const currentCageCells = [];
                const queue = [startCoord];
                const cellsInCageSet = new Set([`${startR}-${startC}`]);

                const maxSize = Math.min(5, size * size);
                const actualMaxSize = Math.max(minTargetSize, maxSize);

                let targetCageSize = minTargetSize;
                 if (actualMaxSize > minTargetSize) {
                     const range = actualMaxSize - minTargetSize + 1;
                     targetCageSize = Math.floor(Math.random() * Math.random() * range) + minTargetSize;
                     targetCageSize = Math.max(minTargetSize, Math.min(actualMaxSize, targetCageSize));
                 }

                let head = 0;
                while(head < queue.length && cellsInCageSet.size < targetCageSize) {
                    const current = queue[head++];
                    if (!currentCageCells.some(cell => cell.r === current.r && cell.c === current.c)) {
                        currentCageCells.push(current);
                    }
                    shuffle(directions);
                    for (const [dr, dc] of directions) {
                        const nr = current.r + dr;
                        const nc = current.c + dc;
                        if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr][nc]) {
                            if (cellsInCageSet.size < targetCageSize) {
                                visited[nr][nc] = true;
                                cellsInCageSet.add(`${nr}-${nc}`);
                                queue.push({ r: nr, c: nc });
                            }
                        }
                    }
                }
                 while (head < queue.length) {
                     const cell = queue[head++];
                     if (!currentCageCells.some(c => c.r === cell.r && c.c === cell.c)) {
                         currentCageCells.push(cell);
                     }
                 }

                const actualSize = currentCageCells.length;
                if (actualSize === 0) {
                     console.error("Logic Error: Created an empty cage from non-deferred cell", startCoord);
                     return null;
                }

                if (actualSize === 1 && minTargetSize === 1) {
                    singleCellCageCount++;
                }

                const cageInfo = calculateCageInfo(currentCageCells, sol, size);

                if (cageInfo) {
                    newCages.push({
                        id: cageIdCounter++, cells: currentCageCells, op: cageInfo.op, target: cageInfo.target, element: null
                    });
                } else {
                    console.warn("Cage info calculation failed for cells:", currentCageCells, ". Attempting fallback split.");
                    if (singleCellCageCount + currentCageCells.length > maxSingleCellCages) {
                         console.error(`Fallback split aborted: Would exceed single cell limit. Failing attempt.`);
                         return null;
                    }
                    currentCageCells.forEach(cell => {
                        if (!visited[cell.r][cell.c]) visited[cell.r][cell.c] = true;
                        if (!newCages.some(cg => cg.cells.some(cc => cc.r === cell.r && cc.c === cell.c))) {
                            singleCellCageCount++;
                            newCages.push({
                                id: cageIdCounter++, cells: [cell], op: '=', target: sol[cell.r][cell.c], element: null
                            });
                        }
                    });
                    console.log(`Fallback split completed. Current single count: ${singleCellCageCount}`);
                }
            }
        }

        for (const deferred of deferredCells) {
             if (visited[deferred.r][deferred.c]) {
                 console.warn(`Deferred cell {${deferred.r},${deferred.c}} was already visited (absorbed?). Skipping.`);
                 continue;
             }

             let merged = false;
             shuffle(directions);

             for (const [dr, dc] of directions) {
                 const nr = deferred.r + dr;
                 const nc = deferred.c + dc;

                 if (nr >= 0 && nr < size && nc >= 0 && nc < size && visited[nr][nc]) {
                     const neighborCageIndex = newCages.findIndex(cage => cage.cells.some(c => c.r === nr && c.c === nc));
                     if (neighborCageIndex !== -1) {
                         const neighborCage = newCages[neighborCageIndex];

                         console.log(`Attaching deferred cell {${deferred.r},${deferred.c}} to cage ${neighborCage.id}`);
                         neighborCage.cells.push(deferred);
                         visited[deferred.r][deferred.c] = true;

                         const newCageInfo = calculateCageInfo(neighborCage.cells, sol, size);
                         if (!newCageInfo) {
                             console.error(`Failed to recalculate info after merging deferred cell into cage ${neighborCage.id}. Failing attempt.`);
                             return null;
                         }
                         neighborCage.op = newCageInfo.op;
                         neighborCage.target = newCageInfo.target;

                         merged = true;
                         break;
                     }
                 }
             }

             if (!merged) {
                 console.error(`Failed to find an adjacent cage to attach deferred cell {${deferred.r},${deferred.c}}. Failing attempt.`);
                 return null;
             }
        }


        let allCellsCovered = true;
        const cellCounts = {};
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) cellCounts[`${r}-${c}`] = 0;
        }
        newCages.forEach(cage => {
            if (!cage || !cage.cells) { allCellsCovered = false; return; }
            cage.cells.forEach(cell => {
                if (cell === undefined || cell.r === undefined || cell.c === undefined) { allCellsCovered = false; return; }
                const key = `${cell.r}-${cell.c}`;
                if (cellCounts.hasOwnProperty(key)) cellCounts[key]++;
                else allCellsCovered = false;
            });
        });
        if (allCellsCovered) {
            for (const key in cellCounts) {
                if (cellCounts[key] !== 1) {
                    allCellsCovered = false;
                    console.error("Verification Error: Cell", key, "covered", cellCounts[key], "times.");
                }
            }
        }

        if (!allCellsCovered) {
            console.error("FATAL: Cage verification failed post-deferral. Not all cells covered exactly once or invalid structure.");
            return null;
        }
        const finalSingleCount = newCages.filter(c => c.cells.length === 1).length;
         if (finalSingleCount > maxSingleCellCages) {
            console.error(`FATAL: Exceeded single cell cage limit post-deferral. Count: ${finalSingleCount}, Max: ${maxSingleCellCages}`);
             return null;
         }

        console.log(`Generated ${newCages.length} cages. Single cell cages: ${finalSingleCount}`);
        return newCages;
    }

      function calculateCageInfo(cells, sol, gridSize) {
        if (!cells || cells.length === 0) return null;
        const values = cells.map(cell => sol[cell.r][cell.c]);
        const cageSize = values.length;

        if (cageSize === 1) {
            return { op: '=', target: values[0] };
        }

        const possibleOps = [];
        const sum = values.reduce((a,b) => a+b, 0);
        if (sum > 0 && sum < gridSize * gridSize * 2) possibleOps.push('+');

        const product = values.reduce((a,b) => a*b, 1);
        const onesCount = values.filter(v => v===1).length;
        if (product > 0 && product < Math.pow(gridSize, cageSize) * 2 && (cageSize <= 2 || onesCount < cageSize -1)) {
            possibleOps.push('*');
        }


        if (cageSize === 2) {
             const max = Math.max(...values);
             const min = Math.min(...values);
             if (max - min > 0) possibleOps.push('-');
             if (min !== 0 && max % min === 0 && max / min > 0) {
                possibleOps.push('/');
             }
        }

        if (possibleOps.length === 0) {
            if (cageSize === 2) possibleOps.push('+');
            else if (cageSize > 2) possibleOps.push('+');
            else return null;
        }


        shuffle(possibleOps);
        const op = possibleOps[0];

        try {
            switch (op) {
                case '+': return { op: '+', target: sum };
                case '*': return { op: '*', target: product };
                case '-':
                    return { op: '-', target: Math.abs(values[0] - values[1]) };
                case '/':
                    const max = Math.max(...values);
                    const min = Math.min(...values);
                    if (min === 0) return null;
                    return { op: '/', target: (max > min ? max / min : min / max) };
                default: return null;
            }
        } catch (e) {
             console.error("Error during cage calculation:", op, values, e);
             return null;
        }
    }


    function createGridData(size) {
         if (!cages || cages.length === 0) {
            console.error("Cannot create grid data: No cages available.");
            return null;
         }
        const data = [];
        for (let r = 0; r < size; r++) {
            data[r] = [];
            for (let c = 0; c < size; c++) {
                const cage = cages.find(cg => cg.cells.some(cell => cell.r === r && cell.c === c));
                if (!cage) {
                    console.error(`CRITICAL Error: Cell ${r},${c} does not belong to any cage!`);
                     data[r][c] = { value: null, notes: new Set(), element: null, cageId: -99 };
                } else {
                    data[r][c] = {
                        value: null, notes: new Set(), element: null, cageId: cage.id
                    };
                }
            }
        }
        return data;
    }

    function createGridUI(size) {
         gridContainer.innerHTML = '';
        gridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        gridContainer.style.gridTemplateRows = `repeat(${size}, 1fr)`;

        const cellValueFontSize = Math.max(1.2, 3 - size * 0.25);
        const noteFontSize = Math.max(0.4, 0.8 - size * 0.06);
        const cageInfoFontSize = Math.max(0.6, 0.9 - size * 0.05);
        const noteGridSize = Math.ceil(Math.sqrt(size));

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cell = document.createElement('div');
                cell.classList.add('gridCell');
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.tabIndex = -1;

                const cageInfoDiv = document.createElement('div');
                cageInfoDiv.classList.add('cageInfo');
                cageInfoDiv.style.fontSize = `${cageInfoFontSize}em`;

                const cellValueDiv = document.createElement('div');
                cellValueDiv.classList.add('cellValue');
                cellValueDiv.style.fontSize = `${cellValueFontSize}em`;

                const cellNotesDiv = document.createElement('div');
                cellNotesDiv.classList.add('cellNotes');
                cellNotesDiv.style.gridTemplateColumns = `repeat(${noteGridSize}, 1fr)`;
                cellNotesDiv.style.gridTemplateRows = `repeat(${noteGridSize}, 1fr)`;
                cellNotesDiv.style.display = 'none';

                for (let n = 1; n <= size; n++) {
                    const noteNumDiv = document.createElement('div');
                    noteNumDiv.classList.add('noteNumber');
                    noteNumDiv.dataset.note = n;
                    noteNumDiv.textContent = n;
                    noteNumDiv.style.fontSize = `${noteFontSize}em`;
                    const noteRow = Math.floor((n - 1) / noteGridSize);
                    const noteCol = (n - 1) % noteGridSize;
                    noteNumDiv.style.gridRowStart = noteRow + 1;
                    noteNumDiv.style.gridColumnStart = noteCol + 1;
                    cellNotesDiv.appendChild(noteNumDiv);
                }

                cell.appendChild(cageInfoDiv);
                cell.appendChild(cellValueDiv);
                cell.appendChild(cellNotesDiv);

                cell.addEventListener('click', handleCellClick);
                gridContainer.appendChild(cell);

                 if (gridData[r]?.[c]) {
                    gridData[r][c].element = cell;
                 } else {
                    console.error(`Attempted to link element for non-existent gridData[${r}][${c}]`);
                 }
            }
        }
    }

    function applyCageStyles() {
         if (!cages) return;

        cages.forEach(cage => {
            if (!cage || !cage.cells || cage.cells.length === 0) return;

             let topLeftCell = cage.cells.reduce((min, cell) => {
                 if (!cell) return min;
                 if (!min || cell.r < min.r || (cell.r === min.r && cell.c < min.c)) return cell;
                 return min;
             }, null);


             if (!topLeftCell || !gridData[topLeftCell.r]?.[topLeftCell.c]?.element) {
                 console.warn(`Cannot find element for top-left cell of cage ${cage.id} during styling. Cage cells:`, cage.cells);
                 return;
             }

            const infoDiv = gridData[topLeftCell.r][topLeftCell.c].element.querySelector('.cageInfo');
             if (!infoDiv) return;

            const opDisplay = cage.op === '*' ? 'x' : cage.op;

            if (cage.op === '=' && cage.cells.length === 1) {
                 infoDiv.textContent = `${cage.target}`;
            } else if (cage.op !== '=') {
                 infoDiv.textContent = `${cage.target}${opDisplay}`;
            } else {
                 infoDiv.textContent = '';
            }

            cage.element = infoDiv;

            cage.cells.forEach(cellCoords => {
                 if (!cellCoords || cellCoords.r === undefined || cellCoords.c === undefined) {
                      console.warn(`Invalid cellCoords found in cage ${cage.id} during border styling:`, cellCoords);
                      return;
                 }
                 if (!gridData[cellCoords.r]?.[cellCoords.c]?.element) {
                     console.warn(`Cannot find element for cell ${cellCoords.r},${cellCoords.c} in cage ${cage.id} during border styling`);
                     return;
                 }
                 const cellElement = gridData[cellCoords.r][cellCoords.c].element;
                const { r, c } = cellCoords;

                const topN = cage.cells.some(nc => nc && nc.r === r - 1 && nc.c === c);
                const botN = cage.cells.some(nc => nc && nc.r === r + 1 && nc.c === c);
                const lefN = cage.cells.some(nc => nc && nc.r === r && nc.c === c - 1);
                const rigN = cage.cells.some(nc => nc && nc.r === r && nc.c === c + 1);

                 cellElement.classList.remove('thick-border-top', 'thick-border-bottom', 'thick-border-left', 'thick-border-right');

                if (!topN) cellElement.classList.add('thick-border-top');
                if (!botN) cellElement.classList.add('thick-border-bottom');
                if (!lefN) cellElement.classList.add('thick-border-left');
                if (!rigN) cellElement.classList.add('thick-border-right');
            });
        });
    }


    function setupNumberInputs(size) {
        numberInputsContainer.innerHTML = '';
        const numCols = size <= 5 ? size : (size <= 7 ? 3 : 4) ;
        numberInputsContainer.style.gridTemplateColumns = `repeat(${numCols}, 1fr)`;
        numberInputsContainer.style.width = `${numCols * 55 + (numCols -1)*10}px`;

        for (let i = 1; i <= size; i++) {
            const button = document.createElement('button');
            button.classList.add('controlButton', 'numInput');
            button.textContent = i;
            button.addEventListener('click', () => handleNumberInput(i));
            numberInputsContainer.appendChild(button);
        }
    }


    function selectCell(r, c) {
         if (r < 0 || r >= currentSize || c < 0 || c >= currentSize) return;

         if (selectedCellCoords) {
             const prevElement = gridData[selectedCellCoords.r]?.[selectedCellCoords.c]?.element;
             if (prevElement) prevElement.classList.remove('selectedCell');
         }

         const newElement = gridData[r]?.[c]?.element;
         if (newElement) {
             newElement.classList.add('selectedCell');
             selectedCellCoords = { r, c };
         } else {
             selectedCellCoords = null;
         }
    }

     function handleCellClick(event) {
        const targetCell = event.currentTarget;
        const r = parseInt(targetCell.dataset.r);
        const c = parseInt(targetCell.dataset.c);
        selectCell(r, c);
    }

    function handleNumberInput(num) {
        if (!selectedCellCoords || num < 1 || num > currentSize) return;
        const { r, c } = selectedCellCoords;
         if (!gridData[r]?.[c]) return;

        saveState();

        const cellData = gridData[r][c];

        if (isNoteMode) {
            toggleNote(r, c, num);
        } else {
            const previousValue = cellData.value;
            if (previousValue === num) {
                 setCellValue(r, c, null);
                 if(previousValue !== null) updateNotesInAffectedCells(r, c, previousValue, false);
            } else {
                setCellValue(r, c, num);
                 if(previousValue !== null) updateNotesInAffectedCells(r, c, previousValue, false);
                 updateNotesInAffectedCells(r, c, num, true);
                checkDuplicates(r, c, num);
                 if (isGridFull()) {
                    checkWinCondition();
                 }
            }
        }
    }

    noteToggleButton.addEventListener('click', () => {
        isNoteMode = !isNoteMode;
        noteToggleButton.classList.toggle('active', isNoteMode);
    });

    clearCellButton.addEventListener('click', clearSelectedCell);

    function clearSelectedCell() {
        if (!selectedCellCoords) return;
        saveState();
        const { r, c } = selectedCellCoords;
        const oldValue = gridData[r]?.[c]?.value;
        if (gridData[r]?.[c]) {
            setCellValue(r, c, null);
            if (oldValue !== null) {
                updateNotesInAffectedCells(r, c, oldValue, false);
            }
        }
    }


     function setCellValue(r, c, value) {
        if (!gridData[r]?.[c]) return;
        const cellData = gridData[r][c];
        const cellValueDiv = cellData.element.querySelector('.cellValue');
        const cellNotesDiv = cellData.element.querySelector('.cellNotes');
        if (!cellValueDiv || !cellNotesDiv) return;

        cellData.value = value;
        cellValueDiv.textContent = value !== null ? value : '';

        if (value !== null) {
            clearNotesForCell(r, c);
            cellNotesDiv.style.display = 'none';
        } else {
            cellNotesDiv.style.display = 'grid';
        }
    }

    function toggleNote(r, c, num) {
         if (!gridData[r]?.[c]) return;
        const cellData = gridData[r][c];
        if (cellData.value !== null) return;

        const notesSet = cellData.notes;
        const noteElement = cellData.element.querySelector(`.noteNumber[data-note="${num}"]`);
         if (!noteElement) return;

        cellData.element.querySelector('.cellNotes').style.display = 'grid';

        if (notesSet.has(num)) {
            notesSet.delete(num);
            noteElement.classList.remove('visible');
        } else {
            let alreadyPlaced = false;
            for(let i=0; i<currentSize; i++) {
                if ((i !== c && gridData[r]?.[i]?.value === num) || (i !== r && gridData[i]?.[c]?.value === num)) {
                    alreadyPlaced = true;
                    break;
                }
            }
            if (!alreadyPlaced) {
                notesSet.add(num);
                noteElement.classList.add('visible');
            } else {

            }
        }
    }

    function clearNotesForCell(r, c) {
         if (!gridData[r]?.[c]) return;
        const cellData = gridData[r][c];
        cellData.notes.clear();
        const noteElements = cellData.element.querySelectorAll('.noteNumber');
        noteElements.forEach(ne => ne.classList.remove('visible'));
    }

    function updateNotesInAffectedCells(row, col, num, isPlacement) {
        for (let c = 0; c < currentSize; c++) {
            if (c !== col) updateSingleCellNotes(row, c, num, isPlacement);
        }
        for (let r = 0; r < currentSize; r++) {
            if (r !== row) updateSingleCellNotes(r, col, num, isPlacement);
        }
    }

    function updateSingleCellNotes(r, c, num, shouldRemove) {
          if (!gridData[r]?.[c]) return;
         const cellData = gridData[r][c];
         if (cellData.value !== null) return;

         const noteElement = cellData.element.querySelector(`.noteNumber[data-note="${num}"]`);
         if (!noteElement) return;

         if (shouldRemove) {
             if (cellData.notes.has(num)) {
                 cellData.notes.delete(num);
                 noteElement.classList.remove('visible');
             }
         }
    }



    function flashElement(element, className) {
         if (!element) return;
         element.classList.remove(className);
         void element.offsetWidth;
         element.classList.add(className);
         element.addEventListener('animationend', () => {
             element.classList.remove(className);
         }, { once: true });
    }

    function checkDuplicates(r, c, num) {
        if (num === null || !gridData[r]?.[c]) return;

        const duplicateCells = [];

        for (let col = 0; col < currentSize; col++) {
            if (col !== c && gridData[r]?.[col]?.value === num) {
                duplicateCells.push({ r: r, c: col });
            }
        }
        for (let row = 0; row < currentSize; row++) {
            if (row !== r && gridData[row]?.[c]?.value === num) {
                 if (!duplicateCells.some(cell => cell.r === row && cell.c === c)) {
                     duplicateCells.push({ r: row, c: c });
                 }
            }
        }

        if (duplicateCells.length > 0) {
             flashElement(gridData[r][c].element, 'duplicate-flash');
             duplicateCells.forEach(cell => {
                 flashElement(gridData[cell.r]?.[cell.c]?.element, 'duplicate-flash');
             });
        }
    }


    clearButton.addEventListener('click', () => {
        if (!gridData.length) return;
        if (!confirm("Are you sure you want to clear the entire grid?")) return;
        saveState();
        for (let r = 0; r < currentSize; r++) {
            for (let c = 0; c < currentSize; c++) {
                 if (gridData[r]?.[c]) {
                    setCellValue(r, c, null);
                 }
            }
        }
        if (selectedCellCoords) {
             const prevSelected = gridData[selectedCellCoords.r]?.[selectedCellCoords.c]?.element;
             if (prevSelected) prevSelected.classList.remove('selectedCell');
             selectedCellCoords = null;
        }
    });

    checkButton.addEventListener('click', () => {
         if (!gridData.length) return;
         let allCorrectSoFar = true;
         let hasEmptyCells = false;
         for (let r = 0; r < currentSize; r++) {
             for (let c = 0; c < currentSize; c++) {
                  if (!gridData[r]?.[c]) continue;
                 const cellData = gridData[r][c];
                 if (cellData.value !== null) {
                     const isCorrect = solution[r]?.[c] !== undefined && cellData.value === solution[r][c];
                     const flashClass = isCorrect ? 'correct-flash' : 'incorrect-flash';
                     if (!isCorrect) allCorrectSoFar = false;
                     flashElement(cellData.element, flashClass);
                 } else {
                     hasEmptyCells = true;
                 }
             }
         }
    });

    function isGridFull() {
         for (let r = 0; r < currentSize; r++) {
            for (let c = 0; c < currentSize; c++) {
                if (!gridData[r]?.[c] || gridData[r][c].value === null) {
                    return false;
                }
            }
        }
        return true;
    }

    function checkWinCondition() {
         for (let r = 0; r < currentSize; r++) {
            for (let c = 0; c < currentSize; c++) {
                if (!gridData[r]?.[c] || solution[r]?.[c] === undefined || gridData[r][c].value === null || gridData[r][c].value !== solution[r][c]) {
                    return false;
                }
            }
        }

        const cagesAreValid = cages.every(cage => {
            if (!cage?.cells) return false;
            const values = cage.cells.map(cell => gridData[cell.r]?.[cell.c]?.value);
            if (values.some(v => v === undefined || v === null)) return false;

            try {
                switch (cage.op) {
                    case '+': return values.reduce((a, b) => a + b, 0) === cage.target;
                    case '*': return values.reduce((a, b) => a * b, 1) === cage.target;
                    case '-':
                        if (values.length !== 2) return false;
                        return Math.abs(values[0] - values[1]) === cage.target;
                    case '/':
                        if (values.length !== 2) return false;
                        const max = Math.max(...values);
                        const min = Math.min(...values);
                        return min !== 0 && max % min === 0 && max / min === cage.target;
                    case '=':
                        return gridData[cage.cells[0].r][cage.cells[0].c].value === cage.target;
                    default: return false;
                }
            } catch (e) {
                 console.error("Error calculating cage validity during win check:", cage, values, e);
                 return false;
            }
        });

        if (cagesAreValid) {
            stopTimer();
            winDetails.textContent = `Kendoku ${currentSize}x${currentSize}`;
            winTime.textContent = `Time : ${formatTime(elapsedTime)}`;
            winPopup.classList.remove('hidden');
            return true;
        }
        return false;
    }

     function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        startTime = Date.now() - elapsedTime;
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            elapsedTime = Date.now() - startTime;
        }
    }

    function resetTimer() {
        stopTimer();
        elapsedTime = 0;
        startTime = Date.now();
        timerDisplay.textContent = 'Time : 00:00';
    }

    function updateTimer() {
        const currentElapsedTime = timerInterval ? (Date.now() - startTime) : elapsedTime;
        timerDisplay.textContent = `Time : ${formatTime(currentElapsedTime)}`;
    }

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    }

     function saveState() {
         const state = {
            grid: gridData.map(row =>
                 row ? row.map(cell => cell ? ({
                     value: cell.value,
                     notes: new Set(cell.notes)
                 }) : null) : null
            )
         };

        const comparableGrid = state.grid
            .filter(row => row !== null)
            .map(row => row.filter(cell => cell !== null)
                         .map(c => ({ v: c.value, n: Array.from(c.notes).sort() }))
            );
        const currentStateString = JSON.stringify(comparableGrid);

        const previousStateString = historyIndex >= 0 ? JSON.stringify(
             history[historyIndex].grid
                .filter(row => row !== null)
                .map(row => row.filter(cell => cell !== null)
                             .map(c => ({ v: c.value, n: Array.from(c.notes).sort() })))
        ) : null;


         if (currentStateString === previousStateString) return;


        history = history.slice(0, historyIndex + 1);
        history.push(state);
        historyIndex++;

        const MAX_HISTORY = 30;
        if (history.length > MAX_HISTORY) {
             history.shift();
             historyIndex--;
        }
        updateUndoRedoButtons();
    }


    function restoreState(stateIndex) {
        if (stateIndex < 0 || stateIndex >= history.length) return;

        const stateToRestore = history[stateIndex];
        const stateGrid = stateToRestore.grid;

        for (let r = 0; r < currentSize; r++) {
            for (let c = 0; c < currentSize; c++) {
                 if (!gridData[r]?.[c]) continue;

                 const savedCell = stateGrid[r]?.[c];
                 if (!savedCell) {
                      setCellValue(r, c, null);
                      continue;
                 };

                 const currentCellData = gridData[r][c];

                 setCellValue(r, c, savedCell.value);
                 currentCellData.notes = new Set(savedCell.notes);

                 const noteElements = currentCellData.element.querySelectorAll('.noteNumber');
                 noteElements.forEach(ne => {
                     const noteNum = parseInt(ne.dataset.note);
                     if (currentCellData.notes.has(noteNum)) {
                         ne.classList.add('visible');
                     } else {
                         ne.classList.remove('visible');
                     }
                 });
            }
        }
        historyIndex = stateIndex;
        updateUndoRedoButtons();
    }


     undoButton.addEventListener('click', () => {
        if (historyIndex > 0) restoreState(historyIndex - 1);
    });

    redoButton.addEventListener('click', () => {
        if (historyIndex < history.length - 1) restoreState(historyIndex + 1);
    });

    function updateUndoRedoButtons() {
         undoButton.disabled = historyIndex <= 0;
         redoButton.disabled = historyIndex >= history.length - 1;
    }

    function handleKeyDown(event) {
        if (gameScreen.classList.contains('hidden') || !winPopup.classList.contains('hidden')) {
            return;
        }
        if ((event.ctrlKey || event.altKey || event.metaKey) && event.key !== 'Shift') {
             return;
        }
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
             return;
        }


        let handled = false;

        if (event.key.startsWith('Arrow') && selectedCellCoords) {
            let { r, c } = selectedCellCoords;
            if (event.key === 'ArrowUp' && r > 0) r--;
            else if (event.key === 'ArrowDown' && r < currentSize - 1) r++;
            else if (event.key === 'ArrowLeft' && c > 0) c--;
            else if (event.key === 'ArrowRight' && c < currentSize - 1) c++;

            if (r !== selectedCellCoords.r || c !== selectedCellCoords.c) {
                 selectCell(r, c);
                 handled = true;
            }
        }
        else if (/^[1-9]$/.test(event.key)) {
             const num = parseInt(event.key);
             if (num >= 1 && num <= currentSize) {
                 handleNumberInput(num);
                 handled = true;
             }
        }
        else if (event.key === '0' || event.key === 'Delete' || event.key === 'Backspace') {
             clearSelectedCell();
             handled = true;
        }
        else if (event.key === 'Shift') {
             isNoteMode = !isNoteMode;
             noteToggleButton.classList.toggle('active', isNoteMode);
             handled = true;
        }

        if (handled) {
            event.preventDefault();
        }
    }


    showScreen('menu');
    updateUndoRedoButtons();
    document.addEventListener('keydown', handleKeyDown);

});