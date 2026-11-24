(() => {
	const root = document.querySelector("#book-flip");
	const loading = document.querySelector("#book-loading");
	const error = document.querySelector("#book-error");
	const pageCount = document.querySelector("#book-page-count");
	const previousButton = document.querySelector("#book-prev");
	const nextButton = document.querySelector("#book-next");
	const reader = document.querySelector(".book-reader");
	const fullscreenButton = document.querySelector("#book-fullscreen");
	const fullscreenError = document.querySelector("#fullscreen-error");
	const zoomOutButton = document.querySelector("#book-zoom-out");
	const zoomInButton = document.querySelector("#book-zoom-in");
	const zoomLevelLabel = document.querySelector("#book-zoom-level");

	if (!root || !loading || !error || !pageCount || !previousButton || !nextButton || !reader || !fullscreenButton || !fullscreenError || !zoomOutButton || !zoomInButton || !zoomLevelLabel) {
		console.error("Os elementos do leitor digital não foram encontrados.");
		return;
	}

	const minZoom = 0.7;
	const maxZoom = 2.5;
	const zoomStep = 0.1;
	let zoomLevel = 1;

	function updateZoom() {
		root.style.transform = `scale(${zoomLevel})`;
		zoomLevelLabel.textContent = `${Math.round(zoomLevel * 100)}%`;
		zoomOutButton.disabled = zoomLevel <= minZoom;
		zoomInButton.disabled = zoomLevel >= maxZoom;
	}

	zoomOutButton.addEventListener("click", () => {
		zoomLevel = Math.max(minZoom, Math.round((zoomLevel - zoomStep) * 10) / 10);
		updateZoom();
	});
	zoomInButton.addEventListener("click", () => {
		zoomLevel = Math.min(maxZoom, Math.round((zoomLevel + zoomStep) * 10) / 10);
		updateZoom();
	});
	updateZoom();

	function updateFullscreenButton() {
		const isFullscreen = document.fullscreenElement === reader;
		fullscreenButton.setAttribute("aria-label", isFullscreen ? "Sair do ecrã inteiro" : "Ativar ecrã inteiro");
		fullscreenButton.classList.toggle("is-fullscreen", isFullscreen);
		fullscreenError.hidden = true;
		window.dispatchEvent(new Event("resize"));
	}

	async function toggleFullscreen() {
		fullscreenError.hidden = true;
		try {
			if (document.fullscreenElement === reader) {
				await document.exitFullscreen();
			} else if (!document.fullscreenElement) {
				await reader.requestFullscreen();
			} else {
				throw new Error("Outro elemento já está em ecrã inteiro.");
			}
		} catch (cause) {
			console.error("Não foi possível alterar o modo de ecrã inteiro:", cause);
			fullscreenError.textContent = "Não foi possível ativar o ecrã inteiro.";
			fullscreenError.hidden = false;
		}
	}

	fullscreenButton.addEventListener("click", toggleFullscreen);
	document.addEventListener("fullscreenchange", updateFullscreenButton);

	function showError() {
		loading.hidden = true;
		error.hidden = false;
		root.hidden = true;
		previousButton.disabled = true;
		nextButton.disabled = true;
	}

	async function openBook() {
		if (!window.pdfjsLib || !window.St || !window.St.PageFlip) {
			throw new Error("Os leitores digitais não foram carregados.");
		}

		window.pdfjsLib.GlobalWorkerOptions.workerSrc =
			"https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

		const pdf = await window.pdfjsLib.getDocument("CNM%20Magazine.pdf").promise;
		const firstPage = await pdf.getPage(1);
		const originalSize = firstPage.getViewport({ scale: 1 });
		const pageHeight = 760;
		const pageWidth = pageHeight * originalSize.width / originalSize.height;
		const pages = [];

		for (let index = 0; index < pdf.numPages; index += 1) {
			const page = document.createElement("div");
			page.className = "book-page";
			if (index === 0 || index === pdf.numPages - 1) {
				page.dataset.density = "hard";
			}

			const canvas = document.createElement("canvas");
			canvas.setAttribute("aria-label", `Página ${index + 1} da CNM Magazine`);
			page.append(canvas);
			pages.push(page);
			root.append(page);
		}

		const flipBook = new window.St.PageFlip(root, {
			width: pageWidth,
			height: pageHeight,
			size: "stretch",
			minWidth: 280,
			maxWidth: 1100,
			minHeight: 400,
			maxHeight: 1400,
			showCover: true,
			mobileScrollSupport: false,
			maxShadowOpacity: 0.35
		});

		const renderedPages = new Map();
		let bookReady = false;
		let turning = false;

		async function renderPage(index) {
			if (index < 0 || index >= pages.length || renderedPages.has(index)) {
				return renderedPages.get(index);
			}

			const renderPromise = (async () => {
				const canvas = pages[index].querySelector("canvas");
				const page = await pdf.getPage(index + 1);
				const originalPageSize = page.getViewport({ scale: 1 });
				const viewport = page.getViewport({ scale: Math.min(2.4, 1800 / originalPageSize.width) });
				canvas.width = Math.ceil(viewport.width);
				canvas.height = Math.ceil(viewport.height);
				await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
			})();
			renderedPages.set(index, renderPromise);
			return renderPromise;
		}

		function prefetchNearbyPages(current) {
			const first = Math.max(0, current - 1);
			const last = Math.min(pages.length - 1, current + 3);
			for (let index = first; index <= last; index += 1) {
				renderPage(index).catch((cause) => {
					console.error(`Não foi possível preparar a página ${index + 1}:`, cause);
					showError();
				});
			}
		}

		function updateControls(current) {
			const visibleCount = flipBook.getOrientation() === "portrait" || current === 0 ? 1 : 2;
			const firstVisible = current + 1;
			const lastVisible = Math.min(pages.length, firstVisible + visibleCount - 1);
			pageCount.textContent = current === 0
				? `Capa · ${pages.length} páginas`
				: `Páginas ${firstVisible}–${lastVisible} de ${pages.length}`;
			previousButton.disabled = !bookReady || turning || current === 0;
			nextButton.disabled = !bookReady || turning || current >= pages.length - 1;
		}

		async function turnPage(direction) {
			if (!bookReady || turning) {
				return;
			}

			turning = true;
			updateControls(flipBook.getCurrentPageIndex());
			const target = flipBook.getCurrentPageIndex() + direction;
			const visibleCount = flipBook.getOrientation() === "portrait" || target === 0 ? 1 : 2;

			try {
				await Promise.all(
					Array.from({ length: visibleCount }, (_, offset) => renderPage(target + offset))
				);
				if (direction > 0) {
					flipBook.flipNext();
				} else {
					flipBook.flipPrev();
				}
			} catch (cause) {
				console.error("Não foi possível preparar as páginas seguintes:", cause);
				turning = false;
				showError();
			}
		}

		flipBook.on("flip", (event) => {
			const current = event.data;
			turning = false;
			updateControls(current);
			prefetchNearbyPages(current);
		});
		flipBook.on("changeOrientation", () => {
			updateControls(flipBook.getCurrentPageIndex());
		});
		flipBook.on("init", (event) => {
			updateControls(event.data.page);
		});

		previousButton.addEventListener("click", () => turnPage(-1));
		nextButton.addEventListener("click", () => turnPage(1));
		flipBook.loadFromHTML(pages);
		await Promise.all([renderPage(0), renderPage(1), renderPage(2)]);
		loading.hidden = true;
		root.parentElement.classList.remove("is-loading");
		bookReady = true;
		updateControls(flipBook.getCurrentPageIndex());
		prefetchNearbyPages(flipBook.getCurrentPageIndex());
	}

	openBook().catch((cause) => {
		console.error("Não foi possível abrir o livro digital:", cause);
		showError();
	});
})();
