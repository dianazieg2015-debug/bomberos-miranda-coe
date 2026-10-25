package com.example.bomberoscuartelcentral

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.bomberoscuartelcentral.data.Roles
import com.example.bomberoscuartelcentral.screens.AdminUsuariosScreen
import com.example.bomberoscuartelcentral.screens.CuestionariosScreen
import com.example.bomberoscuartelcentral.screens.HistorialScreen
import com.example.bomberoscuartelcentral.screens.HomeScreen
import com.example.bomberoscuartelcentral.screens.LoginScreen
import com.example.bomberoscuartelcentral.screens.NuevaMinutaScreen
import com.example.bomberoscuartelcentral.screens.ProfileSetupScreen
import com.example.bomberoscuartelcentral.screens.ThemeSelectionScreen
import com.example.bomberoscuartelcentral.ui.theme.BomberosCuartelCentralTheme
import com.example.bomberoscuartelcentral.ui.theme.TacticalBackground
import com.example.bomberoscuartelcentral.ui.theme.TacticalRed
import com.example.bomberoscuartelcentral.ui.theme.TacticalSurface
import com.example.bomberoscuartelcentral.ui.theme.TacticalTextSecondary
import com.example.bomberoscuartelcentral.viewmodel.CuestionarioViewModel
import com.example.bomberoscuartelcentral.viewmodel.MinutaViewModel
import com.example.bomberoscuartelcentral.viewmodel.ReporteViewModel
import com.example.bomberoscuartelcentral.viewmodel.UsuarioViewModel
import com.example.bomberoscuartelcentral.screens.PendienteAprobacionScreen
import com.example.bomberoscuartelcentral.screens.CambiarPasswordScreen
import com.example.bomberoscuartelcentral.data.Supa
import com.example.bomberoscuartelcentral.data.usuarioDeCorreo
import io.github.jan.supabase.auth.auth

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val context = LocalContext.current
            val prefs = remember { context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE) }
            var isDarkTheme by remember { mutableStateOf(prefs.getBoolean("is_dark_theme", true)) }
            BomberosCuartelCentralTheme(darkTheme = isDarkTheme) {
                Surface(modifier = Modifier.fillMaxSize(), color = TacticalBackground) {
                    AppNavigation(
                        onThemeSelected = { dark ->
                            isDarkTheme = dark
                            prefs.edit().putBoolean("is_dark_theme", dark)
                                .putBoolean("theme_chosen", true).apply()
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun AppNavigation(onThemeSelected: (Boolean) -> Unit) {
    val outerNav = rememberNavController()
    val usuarioViewModel: UsuarioViewModel = viewModel()
    val usuario by usuarioViewModel.usuarioActual.collectAsState()
    val isLoadingProfile by usuarioViewModel.isLoading.collectAsState()
    val haySesion by usuarioViewModel.haySesion.collectAsState()
    val debeCambiarPassword by usuarioViewModel.debeCambiarPassword.collectAsState()
    val context = LocalContext.current
    val irA: (String) -> Unit = { destino ->
        outerNav.navigate(destino) { popUpTo(outerNav.graph.id) { inclusive = true } }
    }

    // La sesión de Supabase se restaura de forma asíncrona: siempre se arranca en "loading"
    NavHost(navController = outerNav, startDestination = "loading") {
        composable("login") {
            LoginScreen(onLoginSuccess = {
                usuarioViewModel.cargarPerfilActual()
                irA("loading")
            })
        }
        composable("loading") {
            LaunchedEffect(usuario, isLoadingProfile, haySesion, debeCambiarPassword) {
                if (!isLoadingProfile) {
                    val prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
                    val themeChosen = prefs.getBoolean("theme_chosen", false)
                    val dest = when {
                        !haySesion -> "login"
                        debeCambiarPassword -> "cambiar_password"
                        usuario == null || !usuario!!.perfilCompleto -> "profile_setup"
                        !usuario!!.aprobado -> "pendiente"
                        !themeChosen -> "theme_selection"
                        else -> "main"
                    }
                    irA(dest)
                }
            }
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = TacticalRed, modifier = Modifier.size(48.dp))
            }
        }
        composable("profile_setup") {
            val usuarioSetup by usuarioViewModel.usuarioActual.collectAsState()
            LaunchedEffect(usuarioSetup?.perfilCompleto) {
                if (usuarioSetup?.perfilCompleto == true) irA("loading")
            }
            ProfileSetupScreen(
                usuarioViewModel = usuarioViewModel,
                onProfileSaved = { irA("loading") },
                onSkip = { usuarioViewModel.cerrarSesion { irA("login") } }
            )
        }
        composable("cambiar_password") {
            var guardando by remember { mutableStateOf(false) }
            var error by remember { mutableStateOf("") }
            CambiarPasswordScreen(
                usuario = Supa.client.auth.currentUserOrNull()?.email?.let(::usuarioDeCorreo).orEmpty(),
                guardando = guardando,
                error = error,
                onGuardar = { nueva ->
                    guardando = true
                    error = ""
                    usuarioViewModel.cambiarPassword(nueva,
                        onSuccess = { guardando = false; irA("loading") },
                        onError = { guardando = false; error = it })
                },
                onCerrarSesion = { usuarioViewModel.cerrarSesion { irA("login") } }
            )
        }
        composable("pendiente") {
            LaunchedEffect(usuario?.aprobado) {
                if (usuario?.aprobado == true) irA("loading")
            }
            PendienteAprobacionScreen(
                usuario = usuario,
                onReintentar = { usuarioViewModel.cargarPerfilActual() },
                onCerrarSesion = { usuarioViewModel.cerrarSesion { irA("login") } }
            )
        }
        composable("theme_selection") {
            ThemeSelectionScreen(onThemeSelected = { dark ->
                onThemeSelected(dark)
                outerNav.navigate("main") { popUpTo("theme_selection") { inclusive = true } }
            })
        }
        composable("main") {
            // Si un admin da de baja o desaprueba la cuenta, la app sale de inmediato
            LaunchedEffect(usuario, isLoadingProfile, haySesion) {
                if (!isLoadingProfile && haySesion && (usuario == null || !usuario!!.aprobado)) irA("loading")
            }
            MainShell(
                usuarioViewModel = usuarioViewModel,
                onLogout = { usuarioViewModel.cerrarSesion { irA("login") } },
                onThemeSelected = onThemeSelected
            )
        }
    }
}

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun MainShell(usuarioViewModel: UsuarioViewModel, onLogout: () -> Unit, onThemeSelected: (Boolean) -> Unit) {
    val innerNav = rememberNavController()
    val reporteViewModel: ReporteViewModel = viewModel()
    val cuestionarioViewModel: CuestionarioViewModel = viewModel()
    val minutaViewModel: MinutaViewModel = viewModel()
    val usuario by usuarioViewModel.usuarioActual.collectAsState()
    val backStackEntry by innerNav.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route ?: "home"
    val esAdmin = usuario?.rol == Roles.ADMIN
    val cuestionariosPendientes by cuestionarioViewModel.cuestionarios.collectAsState()
    val respondidos by cuestionarioViewModel.respondidos.collectAsState()
    val pendientesCount = cuestionariosPendientes.count { it.activo && !respondidos.contains(it.id) }

    LaunchedEffect(usuario?.uid, usuario?.rol, usuario?.area, usuario?.aprobado) {
        reporteViewModel.startListeningWithRole(usuario)
    }
    LaunchedEffect(Unit) { cuestionarioViewModel.startListening() }

    val tabs = buildList {
        add(Triple("home", Icons.Default.Home, "INICIO"))
        add(Triple("nueva", Icons.Default.AddCircle, "NUEVO"))
        add(Triple("historial", Icons.Default.History, "HISTORIAL"))
        add(Triple("cuestionarios", Icons.Default.Assignment, "ENCUESTAS"))
        if (esAdmin) add(Triple("admin", Icons.Default.AdminPanelSettings, "ADMIN"))
    }

    Scaffold(
        containerColor = TacticalBackground,
        bottomBar = {
            NavigationBar(containerColor = TacticalSurface, tonalElevation = 0.dp) {
                tabs.forEach { (route, icon, label) ->
                    val selected = currentRoute == route
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            if (currentRoute != route) {
                                innerNav.navigate(route) {
                                    popUpTo(innerNav.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        },
                        icon = {
                            if (route == "cuestionarios" && pendientesCount > 0) {
                                BadgedBox(badge = { Badge(containerColor = TacticalRed) { Text("$pendientesCount", color = androidx.compose.ui.graphics.Color.White, fontSize = 9.sp) } }) {
                                    Icon(icon, contentDescription = label, tint = if (selected) TacticalRed else TacticalTextSecondary)
                                }
                            } else {
                                Icon(icon, contentDescription = label, tint = if (selected) TacticalRed else TacticalTextSecondary)
                            }
                        },
                        label = {
                            Text(
                                label, fontSize = 9.sp,
                                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                                color = if (selected) TacticalRed else TacticalTextSecondary
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            indicatorColor = TacticalRed.copy(alpha = 0.15f),
                            selectedIconColor = TacticalRed,
                            unselectedIconColor = TacticalTextSecondary
                        )
                    )
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = innerNav,
            startDestination = "home",
            modifier = Modifier.padding(padding),
            enterTransition = { androidx.compose.animation.fadeIn(androidx.compose.animation.core.tween(120)) },
            exitTransition = { androidx.compose.animation.fadeOut(androidx.compose.animation.core.tween(120)) },
            popEnterTransition = { androidx.compose.animation.fadeIn(androidx.compose.animation.core.tween(120)) },
            popExitTransition = { androidx.compose.animation.fadeOut(androidx.compose.animation.core.tween(120)) }
        ) {
            composable("home") { HomeScreen(reporteViewModel, onLogout, onThemeSelected) }
            composable("nueva") { NuevaMinutaScreen(reporteViewModel, usuarioViewModel, minutaViewModel) }
            composable("historial") { HistorialScreen(reporteViewModel, usuarioViewModel) }
            composable("cuestionarios") { CuestionariosScreen(cuestionarioViewModel, usuarioViewModel) }
            composable("admin") { AdminUsuariosScreen(usuarioViewModel) }
        }
    }
}