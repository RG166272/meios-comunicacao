(() => {
	const canvas = document.querySelector("#project-book-cover");
	const fallback = document.querySelector("#project-book-cover-fallback");
	const openButton = document.querySelector("#project-book-cover-open");
	const dialog = document.querySelector("#project-book-cover-dialog");
	const largeImage = document.querySelector("#project-book-cover-large");
	const closeButton = document.querySelector("#project-book-cover-close");

	if (!(canvas instanceof HTMLCanvasElement) || !fallback || !openButton || !dialog || !largeImage || !closeButton) {
		return;
	}

	openButton.addEventListener("click", () => {
		largeImage.src = canvas.toDataURL("image/png");
		dialog.showModal();
	});

	closeButton.addEventListener("click", () => dialog.close());
	dialog.addEventListener("click", (event) => {
		if (event.target === dialog) {
			dialog.close();
		}
	});
	dialog.addEventListener("close", () => {
		largeImage.removeAttribute("src");
	});

	async function renderCover() {
		if (!window.pdfjsLib) {
			throw new Error("O leitor de PDF não foi carregado.");
		}

		window.pdfjsLib.GlobalWorkerOptions.workerSrc =
			"https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

		const pdf = await window.pdfjsLib.getDocument("CNM%20Magazine.pdf").promise;
		const page = await pdf.getPage(1);
		const bounds = canvas.getBoundingClientRect();
		const pixelRatio = 3;
		const originalSize = page.getViewport({ scale: 1 });
		const scale = Math.min(
			bounds.width / originalSize.width,
			bounds.height / originalSize.height
		) * pixelRatio;
		const viewport = page.getViewport({ scale });

		canvas.width = Math.ceil(bounds.width * pixelRatio);
		canvas.height = Math.ceil(bounds.height * pixelRatio);
		const context = canvas.getContext("2d");
		context.fillStyle = "#fff";
		context.fillRect(0, 0, canvas.width, canvas.height);

		await page.render({
			canvasContext: context,
			viewport,
			transform: [
				1,
				0,
				0,
				1,
				(canvas.width - viewport.width) / 2,
				(canvas.height - viewport.height) / 2
			]
		}).promise;
		openButton.disabled = false;
	}

	renderCover().catch((cause) => {
		console.error("Não foi possível carregar a capa da revista:", cause);
		canvas.hidden = true;
		openButton.hidden = true;
		fallback.hidden = false;
	});
})();
