/**
 * PDF Generation API Route - SIMPLIFIED VERSION WITH TYPESCRIPT FIXES
 * Just takes complete HTML and converts it to PDF
 * Fixed all TypeScript errors related to unknown error types
 */

import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

/**
 * Helper function to safely extract error message from unknown error
 * TypeScript-safe way to handle errors in catch blocks
 *
 * @param error - Unknown error from catch block
 * @returns Safe error message string
 */
function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === "string") {
		return error;
	}
	return "An unknown error occurred";
}

/**
 * Helper function to safely extract error details for logging
 * Provides more detailed error information for debugging
 *
 * @param error - Unknown error from catch block
 * @returns Object containing error details
 */
function getErrorDetails(error: unknown): { message: string; stack?: string } {
	if (error instanceof Error) {
		return {
			message: error.message,
			stack: error.stack,
		};
	}
	if (typeof error === "string") {
		return { message: error };
	}
	return { message: "An unknown error occurred" };
}

export async function POST(request: NextRequest) {
	console.log("PDF generation request received");

	let browser = null;
	let page = null;

	try {
		// Parse request body - expecting complete HTML
		const { completeHtml, fileName = "resume" } = await request.json();

		// Validate required fields
		if (!completeHtml) {
			console.error("Missing completeHtml");
			return NextResponse.json(
				{ error: "Missing completeHtml" },
				{ status: 400 }
			);
		}

		console.log(
			"Received HTML for PDF generation, length:",
			completeHtml.length
		);

		// Launch Puppeteer browser
		console.log("Launching Puppeteer browser...");
		browser = await puppeteer.launch({
			headless: true,
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-dev-shm-usage",
				"--disable-accelerated-2d-canvas",
				"--no-first-run",
				"--no-zygote",
				"--disable-gpu",
			],
			timeout: 60000,
		});

		console.log("Browser launched successfully");

		// Create new page
		page = await browser.newPage();
		console.log("New page created");

		// Set viewport for consistent rendering
		await page.setViewport({
			width: 1200,
			height: 1600,
			deviceScaleFactor: 1,
		});

		// Set page content - use the HTML directly from client
		console.log("Setting page content...");
		await page.setContent(completeHtml, {
			waitUntil: ["load", "domcontentloaded", "networkidle0"],
			timeout: 30000,
		});

		console.log("Page content set, waiting for rendering...");

		// Wait for fonts and rendering
		await page.evaluate(async () => {
			await document.fonts.ready;
		});

		// Additional wait for any CSS animations
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Configure PDF options
		const pdfOptions: Parameters<typeof page.pdf>[0] = {
			format: "A4",
			printBackground: true,
			preferCSSPageSize: false,
			margin: {
				top: "1cm",
				right: "1cm",
				bottom: "1cm",
				left: "1cm",
			},
			displayHeaderFooter: false,
			timeout: 60000,
		};

		// console.log("Taking screenshot for debugging...");
		// const screenshot = await page.screenshot({
		// 	fullPage: true,
		// 	type: "png",
		// 	path: "./technical-preview.png", // Sauvegarde temporaire
		// });

		// Generate PDF
		console.log("Generating PDF...");
		const pdfBuffer = await page.pdf(pdfOptions);

		console.log("PDF generated successfully, size:", pdfBuffer.length, "bytes");

		// Return PDF as response
		return new NextResponse(pdfBuffer, {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="${fileName}.pdf"`,
				"Content-Length": pdfBuffer.length.toString(),
			},
		});
	} catch (error) {
		// FIXED: Use helper function to safely extract error message
		const errorDetails = getErrorDetails(error);
		console.error("Error generating PDF:", errorDetails);

		return NextResponse.json(
			{
				error: "Failed to generate PDF",
				details:
					process.env.NODE_ENV === "development"
						? errorDetails.message
						: undefined,
			},
			{ status: 500 }
		);
	} finally {
		// Cleanup with proper error handling
		console.log("Starting cleanup...");

		// FIXED: Safe page cleanup with TypeScript-safe error handling
		try {
			if (page && !page.isClosed()) {
				await page.close();
			}
		} catch (pageError) {
			// FIXED: Use helper function to safely extract error message
			console.error("Error closing page:", getErrorMessage(pageError));
		}

		// FIXED: Safe browser cleanup with TypeScript-safe error handling
		try {
			if (browser && browser.connected) {
				await browser.close();
			}
		} catch (browserError) {
			// FIXED: Use helper function to safely extract error message
			console.error("Error closing browser:", getErrorMessage(browserError));
		}

		console.log("Cleanup completed");
	}
}

export async function GET() {
	return NextResponse.json(
		{ error: "Method not allowed. Use POST." },
		{ status: 405 }
	);
}
