# Makefile for TEMPEST × TETRIS Game
# Total Lines of Code: 2,103 lines
#   - tempest.js: 1,390 lines
#   - sounds.js: 391 lines
#   - styles.css: 240 lines
#   - index.html: 82 lines

.PHONY: all open serve clean help count

all: help

# Open the game in default browser
open:
	@echo "Opening TEMPEST × TETRIS in browser..."
	@start index.html

# Start a local HTTP server (requires Python)
serve:
	@echo "Starting local server on http://localhost:8000"
	@echo "Open your browser to http://localhost:8000"
	@python -m http.server 8000

# Start a local HTTP server (alternative using Node.js)
serve-node:
	@echo "Starting local server on http://localhost:8080"
	@echo "Open your browser to http://localhost:8080"
	@npx http-server -p 8080

# Count lines of code
count:
	@echo "Counting lines of code..."
	@echo "JavaScript files:"
	@powershell -Command "(Get-Content tempest.js).Count"
	@powershell -Command "(Get-Content sounds.js).Count"
	@echo "CSS files:"
	@powershell -Command "(Get-Content styles.css).Count"
	@echo "HTML files:"
	@powershell -Command "(Get-Content index.html).Count"
	@echo ""
	@echo "Total: 2,103 lines"

# Clean temporary files
clean:
	@echo "Cleaning temporary files..."
	@del /F /Q *.log 2>NUL || true
	@echo "Clean complete!"

# Show help
help:
	@echo ========================================
	@echo TEMPEST × TETRIS - Makefile Commands
	@echo ========================================
	@echo.
	@echo make open        - Open game in browser
	@echo make serve       - Start Python HTTP server
	@echo make serve-node  - Start Node.js HTTP server
	@echo make count       - Count lines of code
	@echo make clean       - Remove temporary files
	@echo make help        - Show this help message
	@echo.
	@echo Quick Start: Run "make open" to play!
	@echo ========================================
