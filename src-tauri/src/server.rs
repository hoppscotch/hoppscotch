use std::sync::Arc;

use tokio_util::sync::CancellationToken;

use crate::route;
use crate::state::AppState;

pub async fn run_server(state: Arc<AppState>, cancellation_token: CancellationToken) {
    let routes = route::route(state);

    let server = warp::serve(routes);

    let (addr, server) = server.bind_with_graceful_shutdown(([127, 0, 0, 1], 9119), async move {
        cancellation_token.cancelled().await;
    });

    println!("Server running on http://{}", addr);

    server.await;
}
