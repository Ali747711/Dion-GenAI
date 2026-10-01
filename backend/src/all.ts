/*
 * Single-process entry for hosts where the API and worker must share one
 * container (e.g. one Render web service with local storage). Each module
 * starts itself and registers its own shutdown handlers.
 */
import "./server";
import "./worker";
