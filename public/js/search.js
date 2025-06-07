document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.querySelector('.search-form');
    const searchInput = document.querySelector('.search-input');
    const searchIcon = document.querySelector('.search-icon');

    function handleSearch(event) {
        event.preventDefault();
        const searchQuery = searchInput.value.trim();
        
        if (searchQuery) {
            window.location.href = `/search.html?q=${encodeURIComponent(searchQuery)}`;
        }
    }

    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }

    if (searchIcon) {
        searchIcon.addEventListener('click', handleSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                handleSearch(event);
            }
        });
    }
}); 