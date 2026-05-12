/**
 * Reads `localStorage["mg.sidebar.collapsed"]` synchronously and stamps
 * `data-sidebar-collapsed` onto `<html>` BEFORE paint. Eliminates the
 * flash-of-expanded-sidebar for users who prefer collapsed.
 *
 * Mirrors the next-themes pattern. Render inside the layout's `<head>`
 * (or at the top of the layout body) so it runs before children paint.
 */
export function SidebarStatePreloader() {
  const script = `try{var c=localStorage.getItem("mg.sidebar.collapsed")==="true";document.documentElement.setAttribute("data-sidebar-collapsed",String(c))}catch(e){}`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
